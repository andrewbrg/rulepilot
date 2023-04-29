import { Condition, ConditionType } from "../types/rule";

export class ObjectDiscovery {
  /**
   * Returns the type of condition passed to the function.
   * @param condition The condition to check.
   */
  conditionType(condition: Condition): ConditionType | null {
    return "any" in condition ? "any" : "all" in condition ? "all" : "none";
  }

  /**
   * Checks an object to see if it is a valid condition.
   * @param obj The object to check.
   */
  isCondition(obj: any): boolean {
    return "any" in obj || "all" in obj || "none" in obj;
  }

  /**
   * Checks an object to see if it is a valid constraint.
   * @param obj The object to check.
   */
  isConstraint(obj: any): boolean {
    return "field" in obj && "operator" in obj && "value" in obj;
  }
}
