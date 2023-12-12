import { RuleTypeError } from "../types/error";
import { CriteriaRange, Rule } from "../types/rule";
import { ObjectDiscovery } from "./object-discovery";

export class Introspector {
  private objectDiscovery: ObjectDiscovery = new ObjectDiscovery();

  /**
   * Given a rule, checks the constraints and conditions to determine
   * the possible range of input criteria which would be satisfied by the rule.
   * The rule must be a granular rule to be introspected.
   *
   * @param rule The rule to evaluate.
   * @throws RuleTypeError if the rule is not granular
   */
  determineCriteriaRange<T>(rule: Rule): CriteriaRange<T>[] {
    // The ruleset needs to be granular for this operation to work
    if (!this.objectDiscovery.isGranular(rule)) {
      throw new RuleTypeError(
        "Provided rule not granular, a granular rule is required"
      );
    }

    const conditions =
      rule.conditions instanceof Array ? rule.conditions : [rule.conditions];

    // We need to find all possible distinct results of the rule
    const results = [...new Set(conditions.map((c) => c.result))];

    // Map each result to the condition that produces it
    const conditionMap = new Map();
    for (const result of results) {
      const data = conditionMap.get(result) ?? [];
      if (!data.length) {
        conditionMap.set(result, []);
      }

      data.push(conditions.find((c) => c.result == result));
    }

    // First we need to understand all the fields used across all constraints

    // Return the criteria range
    const criteriaRange: CriteriaRange<T>[] = [];
    for (const [result, conditions] of conditionMap) {
      criteriaRange.push({
        type: result,
        options: [],
      });
    }

    // Assign the default result to the criteria range
    if ("default" in rule && undefined !== rule.default) {
      criteriaRange.push({
        type: rule.default,
        options: null,
      });
    }

    return criteriaRange;
  }
}
