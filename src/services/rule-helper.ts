import { Condition } from "../types";
import { ObjectDiscovery } from "./object-discovery";

export interface SubRuleResult {
  parent?: Condition;
  subRule: Condition;
}

export class RuleHelper {
  #objectDiscovery: ObjectDiscovery = new ObjectDiscovery();

  /**
   * Extracts all sub-rules from a condition.
   * @param condition The condition to extract sub-rules from.
   * @param results The sub-conditions result set
   * @param root The root condition which holds the condition to extract sub-rules from.
   */
  extractSubRules(
    condition: Condition,
    results: SubRuleResult[] = [],
    root?: Condition
  ): SubRuleResult[] {
    if (!root) root = condition;

    // Iterate each node in the condition
    const type = this.#objectDiscovery.conditionType(condition);
    for (const node of condition[type]) {
      // If the node is a sub-rule we need to extract it, using the condition as it's parent
      if (this.#objectDiscovery.isConditionWithResult(node)) {
        results.push({
          parent: this.removeAllSubRules(root),
          subRule: this.removeAllSubRules(node),
        });

        // Recursively find sub-rules in the sub-rule
        for (const element of this.#asArray(node)) {
          // Ignore constraints
          if (!this.#objectDiscovery.isCondition(element)) continue;
          results = this.extractSubRules(element, results, root);
        }

        // Do not re-process as a condition
        continue;
      }

      // If the node is a condition, recurse
      if (this.#objectDiscovery.isCondition(node)) {
        results = this.extractSubRules(node, results, root);
      }
    }

    return results;
  }
  /**
   * Removes all subrules from the provided condition.
   * @param haystack The condition to search in and remove all sub-rules from.
   */
  removeAllSubRules(haystack: Condition): Condition {
    // Clone the condition so that we can modify it
    const clone = JSON.parse(JSON.stringify(haystack));

    // Iterate over each node in the condition
    const type = this.#objectDiscovery.conditionType(clone);
    for (let i = 0; i < clone[type].length; i++) {
      // Check if the current node is a sub-rule
      if (this.#objectDiscovery.isConditionWithResult(clone[type][i])) {
        // Remove the node from the cloned object
        clone[type].splice(i, 1);

        // If the node is now empty, we can prune it
        if (Array.isArray(clone[type]) && !clone[type].length && !clone.result)
          return null;

        // Recurse to re-process updated clone
        return this.removeAllSubRules(clone);
      }

      // If the node is a condition, recurse
      if (this.#objectDiscovery.isCondition(clone[type][i])) {
        clone[type][i] = this.removeAllSubRules(clone[type][i]);
      }
    }

    return this.stripNullProps(clone);
  }

  /**
   * Removes all null properties from an object.
   * @param obj The object to remove null properties from.
   * @param defaults The default values to remove.
   */
  stripNullProps(
    obj: Record<string, any>,
    defaults: any[] = [undefined, null, NaN, ""]
  ) {
    if (defaults.includes(obj)) return;

    if (Array.isArray(obj))
      return obj
        .map((v) =>
          v && typeof v === "object" ? this.stripNullProps(v, defaults) : v
        )
        .filter((v) => !defaults.includes(v));

    return Object.entries(obj).length
      ? Object.entries(obj)
          .map(([k, v]) => [
            k,
            v && typeof v === "object" ? this.stripNullProps(v, defaults) : v,
          ])
          .reduce(
            (a, [k, v]) => (defaults.includes(v) ? a : { ...a, [k]: v }),
            {}
          )
      : obj;
  }

  /**
   * Converts a value to an array if it is not already an array.
   * @param value The value to convert.
   */
  #asArray<R = any>(value: R | R[]): R[] {
    return Array.isArray(value) ? value : [value];
  }
}
