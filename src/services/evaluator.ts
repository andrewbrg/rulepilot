import {
  Rule,
  Condition,
  Constraint,
  WithRequired,
  ConditionType,
} from "../types";
import { ObjectDiscovery } from "./object-discovery";

export class Evaluator {
  #objectDiscovery: ObjectDiscovery = new ObjectDiscovery();

  /** Stores any results from nested conditions */
  #nestedResults: any[];

  /**
   * Evaluates a rule against a set of criteria and returns the result.
   * If the criteria is an array (indicating multiple criteria to test),
   * the rule will be evaluated against each item in the array and
   * an array of results will be returned.
   *
   * @param rule The rule to evaluate.
   * @param criteria The criteria to evaluate the rule against.
   */
  evaluate<T>(rule: Rule, criteria: object | object[]): T | boolean {
    if (criteria instanceof Array) {
      const result: T | boolean[] = [];
      for (const c of criteria) {
        // Clear any previous sub-results.
        this.#nestedResults = [];
        result.push(this.#evaluateRule(rule.conditions, c, rule?.default));
      }

      return this.#nestedResults.length
        ? this.#nestedResults[0]
        : (result as T | boolean);
    }

    // Clear any previous sub-results.
    this.#nestedResults = [];

    const e = this.#evaluateRule<T>(rule.conditions, criteria, rule?.default);
    return this.#nestedResults.length ? this.#nestedResults[0] : e;
  }

  /**
   * Evaluates a rule against a set of criteria and returns the result.
   * @param conditions The conditions to evaluate.
   * @param criteria The criteria to evaluate the conditions against.
   * @param defaultResult The default result to return if no conditions pass.
   * @param isSubRule Indicates whether the rule is a sub-rule.
   */
  #evaluateRule<T>(
    conditions: Condition | Condition[],
    criteria: object,
    defaultResult?: any,
    isSubRule = false
  ): T | boolean {
    // Cater for the case where the conditions property is not an array.
    conditions = conditions instanceof Array ? conditions : [conditions];

    // We should evaluate all conditions and return the result
    // of the first condition that passes.
    for (const condition of conditions) {
      const result = this.#evaluateCondition(condition, criteria);
      if (result) return isSubRule ? true : condition?.result ?? true;
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
  #evaluateCondition(condition: Condition, criteria: object): boolean {
    // The condition must have an 'any' or 'all' property.
    const type = this.#objectDiscovery.conditionType(condition);
    if (!type) return false;

    // If the condition has nested results
    this.#processNestedResults(condition, criteria, type);

    // Set the starting result
    let result: boolean | undefined = undefined;

    // Check each node in the condition.
    for (const node of condition[type]) {
      // Ignore sub-rules when evaluating the condition.
      if (this.#objectDiscovery.isConditionWithResult(node)) continue;

      let fn: () => boolean;
      if (this.#objectDiscovery.isCondition(node))
        fn = () => this.#evaluateCondition(node, criteria);
      if (this.#objectDiscovery.isConstraint(node))
        fn = () => this.#checkConstraint(node, criteria);

      // Process the node
      result = this.#accumulate(type, fn, result);
    }

    return result;
  }

  /**
   * Processes a sub-rule within a condition. It evaluates the condition's constraints to
   * determine if the sub-rule should be evaluated. If the constraints pass, the sub-rule
   * is evaluated and the result (if any) is stored in the sub-rule results array.
   * @param condition The parent condition to process.
   * @param criteria The criteria to evaluate the condition against.
   * @param type The parent condition type.
   */
  #processNestedResults(
    condition: Condition,
    criteria: object,
    type: ConditionType
  ) {
    // Find all the nested conditions which have results
    const candidates = condition[type].filter((node) =>
      this.#objectDiscovery.isConditionWithResult(node)
    ) as WithRequired<Condition, "result">[];

    // For each candidate, check if all the sibling
    // conditions and constraints pass
    candidates.forEach((candidate) => {
      let siblingsPass: boolean | undefined = undefined;
      for (const node of condition[type]) {
        if (this.#objectDiscovery.isConditionWithResult(node)) continue;

        if (this.#objectDiscovery.isCondition(node)) {
          siblingsPass = this.#accumulate(
            type,
            () => this.#evaluateCondition(node, criteria),
            siblingsPass
          );
        }

        if (this.#objectDiscovery.isConstraint(node)) {
          siblingsPass = this.#accumulate(
            type,
            () => this.#checkConstraint(node, criteria),
            siblingsPass
          );
        }
      }

      if (!siblingsPass) return;

      // Evaluate the sub-rule
      const passed = this.#evaluateRule(candidate, criteria, false, true);

      if (passed) this.#nestedResults.push(candidate.result);
    });
  }

  /**
   * Accumulates the result of a function based on the condition type.
   * @param type The condition type.
   * @param fn The function to evaluate.
   * @param result The value to start accumulating from.
   */
  #accumulate(
    type: ConditionType,
    fn: () => boolean,
    result?: boolean
  ): boolean {
    result = undefined === result ? ["all", "none"].includes(type) : result;

    switch (type) {
      case "any":
        result = result || fn();
        break;
      case "all":
        result = result && fn();
        break;
      case "none":
        result = result && !fn();
    }

    return result;
  }

  /**
   * Checks a constraint against a set of criteria and returns true whenever the constraint passes.
   * @param constraint The constraint to evaluate.
   * @param criteria The criteria to evaluate the constraint with.
   */
  #checkConstraint(constraint: Constraint, criteria: object): boolean {
    // If the value contains '.' we should assume it is a nested property
    const criterion = constraint.field.includes(".")
      ? this.#objectDiscovery.resolveNestedProperty(constraint.field, criteria)
      : criteria[constraint.field];

    // If the criteria object does not have the field
    // we are looking for, we should return false.
    if (undefined === criterion) {
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
      case "not contains":
        return (
          !Array.isArray(criterion) || !criterion.includes(constraint.value)
        );
      case "contains any":
        return (
          Array.isArray(constraint.value) &&
          constraint.value.some((x) => criterion.includes(x))
        );
      case "not contains any":
        return (
          !Array.isArray(constraint.value) ||
          !constraint.value.some((x) => criterion.includes(x))
        );
      case "matches":
        return new RegExp(criterion).test(`${constraint.value}`);
      case "not matches":
        return !new RegExp(criterion).test(`${constraint.value}`);
      default:
        return false;
    }
  }
}
