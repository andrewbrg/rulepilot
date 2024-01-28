import { Condition, ConditionType, Constraint, Rule } from "../types/rule";

export class ObjectDiscovery {
  /**
   * Returns the type of condition passed to the function.
   * @param condition The condition to check.
   */
  conditionType(condition: Condition): ConditionType | null {
    if ("any" in condition) return "any";
    if ("all" in condition) return "all";
    if ("none" in condition) return "none";

    return null;
  }

  /**
   * Checks the rule to see if it is granular.
   * @param rule The rule to check.
   */
  isGranular(rule: Rule): boolean {
    const conditions =
      rule.conditions instanceof Array ? rule.conditions : [rule.conditions];

    // Checks each condition making sure it has a result property.
    for (const condition of conditions) {
      if (
        !this.isCondition(condition) ||
        !("result" in condition) ||
        undefined === condition.result
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks an object to see if it is a valid condition.
   * @param obj The object to check.
   */
  isCondition(obj: unknown): obj is Condition {
    return !this.isObject(obj)
      ? false
      : "any" in obj || "all" in obj || "none" in obj;
  }

  /**
   * Checks an object to see if it is a valid constraint.
   * @param obj The object to check.
   */
  isConstraint(obj: unknown): obj is Constraint {
    return !this.isObject(obj)
      ? false
      : "field" in obj && "operator" in obj && "value" in obj;
  }

  /**
   * Returns true if the passed parameter is an object.
   * @param obj The item to test.
   */
  isObject(obj: unknown): obj is object {
    return "object" === typeof obj && !Array.isArray(obj) && obj !== null;
  }

  /**
   * Resolves a nested property from a sting as an object path.
   * @param path The path to resolve.
   * @param obj The object to resolve the path against.
   */
  resolveNestedProperty(path: string, obj: object): any {
    return path.split(".").reduce((prev, curr) => prev?.[curr], obj);
  }
}
