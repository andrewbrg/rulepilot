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
   */
  private hasMutations(criteria: object, result: boolean = false): boolean {
    // If we have already found a mutation, we can stop.
    if (result) return true;

    for (const key of Object.keys(criteria)) {
      if (result) return true;

      // If the value is an object, we should recurse.
      result =
        "object" === typeof criteria[key]
          ? result || this.hasMutations(criteria[key], result)
          : result || this._mutations.has(key);
    }

    return result;
  }

  /**
   * Recursively applies mutations to the criteria.
   * @param criteria The criteria to mutate.
   */
  private async applyMutations(criteria: object): Promise<void> {
    const promises = Object.keys(criteria).map(
      async (key) =>
        new Promise(async (resolve) => {
          if ("object" === typeof criteria[key]) {
            await this.applyMutations(criteria[key]);
          }

          if (this._mutations.has(key)) {
            criteria[key] = await this.execCached(key, criteria);
          }

          resolve(criteria[key]);
        })
    );

    await Promise.all(promises);
  }

  /**
   * Executes a mutation.
   * Defers duplicate executions to the same object from a memory cache.
   * @param key The key of the mutation to execute.
   * @param criteria The criteria to execute the mutation with.
   */
  private async execCached(key: string, criteria: unknown): Promise<any> {
    const param = criteria[key];

    // Create a cache key
    const cacheKey = `${key}${createHash("md5")
      .update(param.toString())
      .digest("hex")}`;

    // If the mutation has already been executed, return the cached result.
    if (this._cache.has(cacheKey)) {
      Logger.debug(`Cache hit on "${key}" with param "${param}"`);
      return this._cache.get(cacheKey);
    }

    // If the mutation is already in progress, wait for it to finish.
    if (this._buffer.get(cacheKey)) {
      return await new Promise((resolve) => {
        Logger.debug(`Waiting on mutation "${key}" with param "${param}"`);
        this._eventEmitter.once(`mutation:${cacheKey}`, (result) => {
          Logger.debug(`Resolved mutation "${key}" with param "${param}"`);
          resolve(result);
        });
      });
    }

    // Set the buffer to true to indicate that the mutation is in progress.
    // This prevents duplicate executions of the same mutation.
    this._buffer.set(cacheKey, true);

    // Execute the mutation
    Logger.debug(`Running mutation "${key}" with param "${param}"`);
    const mutation = this._mutations.get(key);
    const result = await mutation(param, criteria);

    // Cache the result and release the buffer to false.
    this._cache.set(cacheKey, result);
    this._buffer.set(cacheKey, false);

    // Emit an event to indicate that the mutation has been executed.
    this._eventEmitter.emit(`mutation:${cacheKey}`, result);

    return result;
  }
}
