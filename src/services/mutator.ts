import { ObjectDiscovery } from "./object-discovery";

export class Mutator {
  private _objectDiscovery: ObjectDiscovery = new ObjectDiscovery();
  private _mutations: Map<string, Function> = new Map();

  add(name: string, mutation: Function) {
    this._mutations.set(name, mutation);
  }

  async mutate(criteria: object | object[]): Promise<object | object[]> {
    // Identify the type of criteria we are dealing with.
    if (!this.requiresMutation(criteria)) {
      return criteria;
    }

    // If we need to mutate the criteria, we will create a copy of it.
    const copy = { ...criteria };

    // We will iterate over each mutation and apply it to the criteria.
    for (const [name, mutation] of this._mutations) {
      const criterion = this._objectDiscovery.resolveNestedProperty(name, copy);

      if (name in copy && "function" === typeof criterion) {
        copy[name] = await mutation();
      }
    }

    return copy;
  }

  private requiresMutation(criteria: object): boolean {
    let result = false;

    Object.keys(criteria).forEach((key) => {
      if (criteria[key] instanceof Array) {
        criteria[key].forEach((item) => {
          result = result || this.requiresMutation(item);
        });
      }

      if ("object" === typeof criteria[key]) {
        return true;
      }
    });

    return false;
  }
}
