import { createHash } from "crypto";
import { EventEmitter } from "events";

import { Logger } from "./logger";
import { ObjectDiscovery } from "./object-discovery";

export class Mutator {
  #cache: Map<string, any> = new Map();
  #buffer: Map<string, boolean> = new Map();
  #mutations: Map<string, Function> = new Map();

  #objectDiscovery = new ObjectDiscovery();
  #eventEmitter = new EventEmitter();

  /**
   * Adds a mutation to the mutator instance.
   * @param name The name of the mutation.
   * @param mutation The mutation function.
   */
  add(name: string, mutation: Function): void {
    this.#mutations.set(name, mutation);
  }

  /**
   * Removes a mutation to the mutator instance.
   * Any cached mutation values for this mutation will be purged.
   * @param name The name of the mutation.
   */
  remove(name: string): void {
    this.clearCache(name);
    this.#mutations.delete(name);
  }

  /**
   * Clears the mutator cache.
   * The entire cache, or cache for a specific mutator, can be cleared
   * by passing or omitting the mutator name as an argument.
   * @param name The mutator name to clear the cache for.
   */
  clearCache(name?: string): void {
    if (!name) {
      this.#cache.clear();
      return;
    }

    for (const key of this.#cache.keys()) {
      if (key.startsWith(name)) {
        this.#cache.delete(key);
      }
    }
  }

  /**
   * Mutates and returns a criteria object.
   * @param criteria The criteria to mutate.
   */
  async mutate(criteria: object | object[]): Promise<object | object[]> {
    // Handles checking the mutability of a criteria object
    // If it is mutable it will be cloned, mutated and returned
    const exec = async (criteria: object | object[]) => {
      // If there are no mutations or the criteria does not contain
      // any of the mutation keys, return the criteria as is.
      if (!this.#mutations.size || !this.#hasMutations(criteria)) {
        return criteria;
      }

      // Make a copy of the criteria.
      const copy = { ...criteria };

      // Apply the mutations to the copy and return it.
      await this.#applyMutations(copy);
      return copy;
    };

    // If the criteria is an array, we want to apply the mutations
    // to each item in the array in parallel.
    if (criteria instanceof Array) {
      return await Promise.all(
        criteria.map(
          (c) =>
            new Promise(async (resolve) => {
              resolve(await exec(c));
            })
        )
      );
    } else {
      return await exec(criteria);
    }
  }

  /**
   * Checks if the criteria contains any mutate-able properties.
   * @param criteria The criteria to check.
   * @param result Whether a mutate-able property has been found.
   * @param parentPath The parent path to the current property.
   */
  #hasMutations(
    criteria: object,
    result: boolean = false,
    parentPath: string = ""
  ): boolean {
    // If we have already found a mutation, we can stop.
    if (result) return true;

    for (const key of Object.keys(criteria)) {
      if (result) return true;

      // Prepare dotted path to the current property.
      const path = parentPath ? `${parentPath}.${key}` : key;

      // If the value is an object, we should recurse.
      result = this.#objectDiscovery.isObject(criteria[key])
        ? result || this.#hasMutations(criteria[key], result, path)
        : result || this.#mutations.has(path);
    }

    return result;
  }

  /**
   * Recursively applies mutations to the criteria.
   * @param criteria The criteria to mutate.
   * @param parentPath The parent path to the current property.
   */
  async #applyMutations(
    criteria: object,
    parentPath: string = ""
  ): Promise<void> {
    const promises = Object.keys(criteria).map(
      async (key) =>
        new Promise(async (resolve) => {
          // Prepare dotted path to the current property.
          const path = parentPath ? `${parentPath}.${key}` : key;

          if (this.#objectDiscovery.isObject(criteria[key])) {
            await this.#applyMutations(criteria[key], path);
          }

          if (this.#mutations.has(path)) {
            criteria[key] = await this.#execMutation(key, criteria, path);
          }

          resolve(criteria[key]);
        })
    );

    await Promise.all(promises);
  }

  /**
   * Executes a mutation.
   * Defers duplicate executions to the same object from a memory cache.
   * @param criteriaProp The criteria property to execute the mutation on.
   * @param criteria The criteria to execute the mutation with.
   * @param mutationKey The key of the mutation to execute.
   */
  async #execMutation(
    criteriaProp: string,
    criteria: unknown,
    mutationKey: string
  ): Promise<any> {
    const value = criteria[criteriaProp];

    // Create a cache key
    const cacheKey = `${mutationKey}${createHash("md5")
      .update(value.toString())
      .digest("hex")}`;

    // If the mutation has already been executed, return the cached result.
    if (this.#cache.has(cacheKey)) {
      Logger.debug(`Cache hit on "${mutationKey}" with param "${value}"`);
      return this.#cache.get(cacheKey);
    }

    // If the mutation is already in progress, wait for it to finish.
    if (this.#buffer.get(cacheKey)) {
      return await new Promise((resolve) => {
        Logger.debug(
          `Waiting on mutation "${mutationKey}" with param "${value}"`
        );
        this.#eventEmitter.once(`mutation:${cacheKey}`, (result) => {
          Logger.debug(
            `Resolved mutation "${mutationKey}" with param "${value}"`
          );
          resolve(result);
        });
      });
    }

    // Set the buffer to true to indicate that the mutation is in progress.
    // This prevents duplicate executions of the same mutation.
    this.#buffer.set(cacheKey, true);

    // Execute the mutation
    Logger.debug(`Running mutation "${mutationKey}" with param "${value}"`);
    const mutation = this.#mutations.get(mutationKey);
    const result = await mutation(value, criteria);

    // Cache the result and release the buffer to false.
    this.#cache.set(cacheKey, result);
    this.#buffer.set(cacheKey, false);

    // Emit an event to indicate that the mutation has been executed.
    this.#eventEmitter.emit(`mutation:${cacheKey}`, result);

    return result;
  }
}
