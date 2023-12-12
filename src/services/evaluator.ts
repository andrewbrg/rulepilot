import { ObjectDiscovery } from "./object-discovery";
import { Condition, Constraint, Rule } from "../types/rule";

export class Evaluator {
  private _objectDiscovery: ObjectDiscovery = new ObjectDiscovery();

  /**
   * Evaluates a rule against a set of criteria and returns the result.
   * If the criteria is an array (indicating multiple criteria to test),
   * the rule will be evaluated against each item in the array and
   * an array of results will be returned.
   *
   * @param rule The rule to evaluate.
   * @param criteria The criteria to evaluate the rule against.
   */
  evaluate(rule: Rule, criteria: object | object[]): boolean | any {
    // Cater for the case where the conditions property is not an array.
    const conditions =
      rule.conditions instanceof Array ? rule.conditions : [rule.conditions];

    if (criteria instanceof Array) {
      const result = [];
      for (const c of criteria) {
        result.push(this.evaluateRule(conditions, c, rule?.default));
      }

      return result;
    }

    return this.evaluateRule(conditions, criteria, rule?.default);
  }

  /**
   * Evaluates a rule against a set of criteria and returns the result.
   * @param conditions The conditions to evaluate.
   * @param criteria The criteria to evaluate the conditions against.
   * @param defaultResult The default result to return if no conditions pass.
   */
  private evaluateRule(
    conditions: Condition[],
    criteria: object,
    defaultResult?: any
  ): boolean | any {
    // We should evaluate all conditions and return the result
    // of the first condition that passes.
    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, criteria);
      if (result) {
        return condition?.result ?? true;
      }
    }

    // If no conditions pass, we should return the default result of
    // the rule or false if no default result is provided.
    return defaultResult ?? false;
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
      let fn: string;
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
    // If the value contains '.' we should assume it is a nested property
    const criterion = constraint.field.includes(".")
      ? this._objectDiscovery.resolveNestedProperty(constraint.field, criteria)
      : criteria[constraint.field];

    // If the criteria object does not have the field
    // we are looking for, we should return false.
    if (!criterion) {
      return false;
    }

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
      case "contains":
        return Array.isArray(criterion) && criterion.includes(constraint.value);
      case "contains any":
        return (
          Array.isArray(constraint.value) &&
          constraint.value.some((x) => criterion.includes(x))
        );
      default:
        return false;
    }
  }
}
