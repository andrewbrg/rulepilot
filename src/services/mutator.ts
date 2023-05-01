import { createHash } from "crypto";
import { EventEmitter } from "events";

import { Logger } from "./logger";

export class Mutator {
  private _cache: Map<string, any> = new Map();
  private _buffer: Map<string, boolean> = new Map();

  private _eventEmitter = new EventEmitter();
  private _mutations: Map<string, Function> = new Map();

  /**
   * Adds a mutation to the mutator instance.
   * @param name The name of the mutation.
   * @param mutation The mutation function.
   */
  add(name: string, mutation: Function): void {
    this._mutations.set(name, mutation);
  }

  /**
   * Removes a mutation to the mutator instance.
   * Any cached mutation values for this mutation will be purged.
   * @param name The name of the mutation.
   */
  remove(name: string): void {
    this.clearCache(name);
    this._mutations.delete(name);
  }

  /**
   * Clears the mutator cache.
   * The entire cache, or cache for a specific mutator, can be cleared
   * by passing or omitting the mutator name as an argument.
   * @param name The mutator name to clear the cache for.
   */
  clearCache(name?: string): void {
    if (!name) {
      this._cache.clear();
      return;
    }

    for (const key of this._cache.keys()) {
      if (key.startsWith(name)) {
        this._cache.delete(key);
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
    const exec = async (criteria) => {
      // If there are no mutations or the criteria does not contain
      // any of the mutation keys, return the criteria as is.
      if (!this._mutations.size || !this.hasMutations(criteria)) {
        return criteria;
      }

      // Make a copy of the criteria.
      const copy = { ...criteria };

      // Apply the mutations to the copy and return it.
      await this.applyMutations(copy);
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
  private hasMutations(
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
      result =
        "object" === typeof criteria[key]
          ? result || this.hasMutations(criteria[key], result, path)
          : result || this._mutations.has(path);
    }

    return result;
  }

  /**
   * Recursively applies mutations to the criteria.
   * @param criteria The criteria to mutate.
   * @param parentPath The parent path to the current property.
   */
  private async applyMutations(
    criteria: object,
    parentPath: string = ""
  ): Promise<void> {
    const promises = Object.keys(criteria).map(
      async (key) =>
        new Promise(async (resolve) => {
          // Prepare dotted path to the current property.
          const path = parentPath ? `${parentPath}.${key}` : key;

          if ("object" === typeof criteria[key]) {
            await this.applyMutations(criteria[key], path);
          }

          if (this._mutations.has(path)) {
            criteria[key] = await this.execMutation(key, criteria, path);
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
  private async execMutation(
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
    if (this._cache.has(cacheKey)) {
      Logger.debug(`Cache hit on "${mutationKey}" with param "${value}"`);
      return this._cache.get(cacheKey);
    }

    // If the mutation is already in progress, wait for it to finish.
    if (this._buffer.get(cacheKey)) {
      return await new Promise((resolve) => {
        Logger.debug(
          `Waiting on mutation "${mutationKey}" with param "${value}"`
        );
        this._eventEmitter.once(`mutation:${cacheKey}`, (result) => {
          Logger.debug(
            `Resolved mutation "${mutationKey}" with param "${value}"`
          );
          resolve(result);
        });
      });
    }

    // Set the buffer to true to indicate that the mutation is in progress.
    // This prevents duplicate executions of the same mutation.
    this._buffer.set(cacheKey, true);

    // Execute the mutation
    Logger.debug(`Running mutation "${mutationKey}" with param "${value}"`);
    const mutation = this._mutations.get(mutationKey);
    const result = await mutation(value, criteria);

    // Cache the result and release the buffer to false.
    this._cache.set(cacheKey, result);
    this._buffer.set(cacheKey, false);

    // Emit an event to indicate that the mutation has been executed.
    this._eventEmitter.emit(`mutation:${cacheKey}`, result);

    return result;
  }
}
