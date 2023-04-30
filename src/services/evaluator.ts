import { ObjectDiscovery } from "./object-discovery";
import { Condition, Constraint, Rule } from "../types/rule";

export class Evaluator {
  private _objectDiscovery: ObjectDiscovery = new ObjectDiscovery();

  /**
   * Evaluates a rule against a set of criteria and returns the result.
   * @param rule The rule to evaluate.
   * @param criteria The criteria to evaluate the rule against.
   */
  evaluate(rule: Rule, criteria: object): boolean | any {
    // Cater for the case where the conditions property is not an array.
    const conditions =
      rule.conditions instanceof Array ? rule.conditions : [rule.conditions];

    // We should evaluate all conditions and return the result
    // of the first condition that passes.
    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, criteria);
      if (result) {
        return condition?.result ?? true;
      }
    }

    // If no conditions pass, we should return the default value of
    // the rule or false if no default value is provided.
    return rule?.default ?? false;
  }

  /**
   * Evaluates a condition against a set of criteria and returns the result.
   * Uses recursion to evaluate nested conditions.
   * @param condition The condition to evaluate.
   * @param criteria The criteria to evaluate the condition against.
   */
  private evaluateCondition(condition: Condition, criteria: object): boolean {
    // The condition must have an 'any' or 'all' property.
    const type = this._objectDiscovery.conditionType(condition);
    if (!type) {
      return false;
    }

    // If the type is 'all' or 'none', we should set the initial
    // result to true, otherwise we should set it to false.
    let result = ["all", "none"].includes(type);

    // Check each node in the condition.
    for (const node of condition[type]) {
      let fn;
      if (this._objectDiscovery.isCondition(node)) {
        fn = "evaluateCondition";
      }
      if (this._objectDiscovery.isConstraint(node)) {
        fn = "checkConstraint";
      }

      // Process the node
      switch (type) {
        case "any":
          result = result || this[fn](node, criteria);
          break;
        case "all":
          result = result && this[fn](node, criteria);
          break;
        case "none":
          result = result && !this[fn](node, criteria);
      }
    }

    return result;
  }

  /**
   * Checks a constraint against a set of criteria and returns true whenever the constraint passes.
   * @param constraint The constraint to evaluate.
   * @param criteria The criteria to evaluate the constraint with.
   */
  private checkConstraint(constraint: Constraint, criteria: object): boolean {
    // If the criteria object does not have the field
    // we are looking for, we should return false.
    if (!criteria.hasOwnProperty(constraint.field)) {
      return false;
    }

    const criterion = criteria[constraint.field];

    switch (constraint.operator) {
      case "==":
        return criterion == constraint.value;
      case "!=":
        return criterion != constraint.value;
      case ">":
        return criterion > constraint.value;
      case ">=":
        return criterion >= constraint.value;
      case "<":
        return criterion < constraint.value;
      case "<=":
        return criterion <= constraint.value;
      case "in":
        return (
          Array.isArray(constraint.value) &&
          constraint.value.includes(criterion as never)
        );
      case "not in":
        return (
          !Array.isArray(constraint.value) ||
          !constraint.value.includes(criterion as never)
        );
      default:
        return false;
    }
  }
}
