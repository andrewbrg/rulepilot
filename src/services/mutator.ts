import { createHash } from "crypto";
import { EventEmitter } from "events";

export class Mutator {
  private _cache: Map<string, any> = new Map();
  private _buffer: Map<string, boolean> = new Map();

  private _eventEmitter = new EventEmitter();
  private _mutations: Map<string, Function> = new Map();

  /**
   * Adds a mutation to the mutator.
   * @param name The name of the mutation.
   * @param mutation The mutation function.
   */
  add(name: string, mutation: Function) {
    this._mutations.set(name, mutation);
  }

  /**
   * Mutates and returns a criteria object.
   * @param criteria
   */
  async mutate(criteria: object | object[]): Promise<object | object[]> {
    // Cater for the case where the criteria is an array.
    if (criteria instanceof Array) {
      const result = [];
      for (const c of criteria) {
        result.push(await this.mutate(c));
      }

      return result;
    }

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
  }

  /**
   * Checks if the criteria contains any mutate-able properties.
   * @param criteria The criteria to check.
   * @param result Whether or not a mutate-able property has been found.
   */
  private hasMutations(criteria: object, result: boolean = false): boolean {
    for (const key of Object.keys(criteria)) {
      // If we have already found a mutation, we can stop.
      if (result) return true;

      // If the value is an object, we should recurse.
      if ("object" === typeof criteria[key]) {
        result = result || this.hasMutations(criteria[key], result);
      }

      result = result || this._mutations.has(key);
    }

    return result;
  }

  /**
   * Recursively applies mutations to the criteria.
   * @param criteria The criteria to mutate.
   */
  private async applyMutations(criteria: object): Promise<void> {
    for (const key of Object.keys(criteria)) {
      if ("object" === typeof criteria[key]) {
        await this.applyMutations(criteria[key]);
      }

      if (this._mutations.has(key)) {
        criteria[key] = await this.execCached(key, criteria[key]);
      }
    }
  }

  /**
   * Executes a mutation.
   * Defers duplicate executions to the same object from a memory cache.
   * @param key The key of the mutation to execute.
   * @param param The parameter to pass to the mutation function.
   */
  private async execCached(key: string, param: unknown): Promise<void> {
    const cacheKey = `${key}${createHash("md5")
      .update(param.toString())
      .digest("hex")}`;

    // If the mutation has already been executed, return the cached result.
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    // If the mutation is already in progress, wait for it to finish.
    if (this._buffer.get(cacheKey)) {
      return await new Promise((resolve) => {
        this._eventEmitter.once(`mutation:${cacheKey}`, (result) => {
          resolve(result);
        });
      });
    }

    // Set the buffer to true to indicate that the mutation is in progress.
    // This prevents duplicate executions of the same mutation.
    this._buffer.set(cacheKey, true);

    // Execute the mutation
    const mutation = this._mutations.get(key);
    const result = await mutation(param);

    // Cache the result and set the buffer to false.
    this._cache.set(cacheKey, result);
    this._buffer.set(cacheKey, false);

    // Emit an event to indicate that the mutation has been executed.
    this._eventEmitter.emit(`mutation:${cacheKey}`, result);

    return result;
  }
}
