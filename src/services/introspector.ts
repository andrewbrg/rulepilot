import {
  Rule,
  Condition,
  Constraint,
  ConditionType,
  CriteriaRange,
} from "../types/rule";
import { RuleTypeError } from "../types/error";
import { ObjectDiscovery } from "./object-discovery";

export class Introspector {
  private _objectDiscovery: ObjectDiscovery = new ObjectDiscovery();

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
    if (!this._objectDiscovery.isGranular(rule)) {
      throw new RuleTypeError(
        "Provided rule not granular, a granular rule is required"
      );
    }

    const conditions =
      rule.conditions instanceof Array ? rule.conditions : [rule.conditions];

    // We need to find all possible distinct results of the rule
    const results = [...new Set(conditions.map((c) => c.result))];

    // Then we map each result to the condition that produces
    // it to create a map of results to conditions
    const conditionMap = new Map<T, Condition[]>();
    for (const result of results) {
      const data = conditionMap.get(result) ?? [];
      if (!data.length) {
        conditionMap.set(result, []);
      }

      data.push(conditions.find((c) => c.result == result));
    }

    // Using this information we can build the skeleton of the introspected criteria range
    const criteriaRange: CriteriaRange<T>[] = [];
    for (const result of conditionMap.keys()) {
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

    // Next we need to understand all the fields used across all constraints and create a set of them
    const fields = this.findUniqueConstraintFields(conditions);

    // For each item in the `criteriaRange` we need to populate the options
    // with the possible range of input values (in the criteria) which would result in the
    // given result. Rules are recursive.
    return this.populateCriteriaRange(criteriaRange, conditionMap, fields);
  }

  /**
   * Populates the criteria range options with the possible range of input values
   * @param criteriaRange The criteria range to populate.
   * @param conditionMap The map of results to conditions.
   * @param fields The set of fields to populate the criteria range with.
   */
  private populateCriteriaRange<T>(
    criteriaRange: CriteriaRange<T>[],
    conditionMap: Map<T, Condition[]>,
    fields: Set<string>
  ): CriteriaRange<T>[] {
    // For each set of conditions which produce the same result
    for (const [result, conditions] of conditionMap) {
      // For each condition in that set
      for (const condition of conditions) {
        const type = this._objectDiscovery.conditionType(condition);
        if (!type) {
          continue;
        }

        // Find the criteria range object for the result
        let criteriaRangeEntry = criteriaRange.find((c) => c.type == result);

        // Iterate over each property of the condition
        for (const node of condition[type]) {
          if (this._objectDiscovery.isConstraint(node)) {
            const constraint = node as Constraint;
            criteriaRangeEntry = this.determineCriteriaRangeOption(
              criteriaRangeEntry,
              constraint,
              type
            );
          }

          if (this._objectDiscovery.isCondition(node)) {
            const condition = node as Condition;
            criteriaRangeEntry = this.populateCriteriaRange(
              [criteriaRangeEntry],
              new Map<T, Condition[]>([[result, [condition]]]),
              fields
            ).pop();
          }

          // Update the original set of criteria range objects
          // with the updated criteria range object
          const index = criteriaRange.findIndex((c) => c.type == result);
          criteriaRange[index] = criteriaRangeEntry;
        }
      }
    }

    return criteriaRange;
  }

  /**
   * Updates a criteria range entry based on the constraint and condition type.
   * @param criteriaRangeEntry The criteria range entry to update.
   * @param constraint The constraint we are updating the criteria range entry with.
   * @param conditionType The condition type the constraint belongs to.
   */
  private determineCriteriaRangeOption<T>(
    criteriaRangeEntry: CriteriaRange<T>,
    constraint: Constraint,
    conditionType: ConditionType
  ): CriteriaRange<T> {
    // todo fix the switch statements

    // When condition is an all, we need to create a new object in the criteria range
    // options and add all the possible inputs which would satisfy the condition.
    if ("all" === conditionType) {
      const option = {};
      switch (constraint.operator) {
        case "==":
          option[constraint.field] = constraint.value;
          break;
        case "!=":
          option[constraint.field] = constraint.value;
          break;
        case ">":
          option[constraint.field] = constraint.value;
          break;
        case "<":
          option[constraint.field] = constraint.value;
          break;
        case ">=":
          option[constraint.field] = constraint.value;
          break;
        case "<=":
          option[constraint.field] = constraint.value;
          break;
        case "in":
          option[constraint.field] = constraint.value;
          break;
        case "not in":
          option[constraint.field] = constraint.value;
          break;
        case "contains":
          option[constraint.field] = constraint.value;
          break;
        case "contains any":
          option[constraint.field] = constraint.value;
          break;
      }

      criteriaRangeEntry.options.push(option);
    }

    // When condition is an any, we need to create a new object in the criteria range
    // options for each criterion in the condition and add all the possible inputs
    // which would satisfy the criterion.
    if ("any" === conditionType) {
      switch (constraint.operator) {
        case "==":
          criteriaRangeEntry.options.push({
            [constraint.field]: constraint.value,
          });
          break;
        case "!=":
          criteriaRangeEntry.options.push({
            [constraint.field]: constraint.value,
          });
          break;
        case ">":
          criteriaRangeEntry.options.push({
            [constraint.field]: constraint.value,
          });
          break;
        case "<":
          criteriaRangeEntry.options.push({
            [constraint.field]: constraint.value,
          });
          break;
        case ">=":
          criteriaRangeEntry.options.push({
            [constraint.field]: constraint.value,
          });
          break;
        case "<=":
          criteriaRangeEntry.options.push({
            [constraint.field]: constraint.value,
          });
          break;
        case "in":
          criteriaRangeEntry.options.push({
            [constraint.field]: constraint.value,
          });
          break;
        case "not in":
          criteriaRangeEntry.options.push({
            [constraint.field]: constraint.value,
          });
          break;
        case "contains":
          criteriaRangeEntry.options.push({
            [constraint.field]: constraint.value,
          });
          break;
        case "contains any":
          criteriaRangeEntry.options.push({
            [constraint.field]: constraint.value,
          });
          break;
      }
    }

    // todo add for none

    return criteriaRangeEntry;
  }

  /**
   * Given a list of conditions, returns a set of all the unique fields used in constraints.
   * @param conditions The conditions to search.
   * @param fields The set of fields to add to.
   */
  private findUniqueConstraintFields(
    conditions: Condition[],
    fields: Set<string> = new Set()
  ): Set<string> {
    for (const condition of conditions) {
      const type = this._objectDiscovery.conditionType(condition);
      if (!type) {
        continue;
      }

      // Iterate over each property of the condition
      for (const node of condition[type]) {
        if (this._objectDiscovery.isConstraint(node)) {
          const constraint = node as Constraint;
          constraint.field && fields.add(constraint.field);
        }

        if (this._objectDiscovery.isCondition(node)) {
          const condition = node as Condition;
          this.findUniqueConstraintFields([condition], fields).forEach((f) =>
            fields.add(f)
          );
        }
      }
    }

    return fields;
  }
}
