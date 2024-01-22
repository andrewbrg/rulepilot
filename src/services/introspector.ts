import {
  Rule,
  Condition,
  Constraint,
  CriteriaRange,
  ConditionType,
} from "../types/rule";
import { RuleTypeError } from "../types/error";
import { ObjectDiscovery } from "./object-discovery";

interface IntrospectionStep {
  currentType: ConditionType;
  parentType?: ConditionType;
  depth: number;
  option: Record<string, unknown>;
}

export class Introspector {
  private _objectDiscovery: ObjectDiscovery = new ObjectDiscovery();

  private _introspectionSteps: IntrospectionStep[] = [];

  /**
   * Given a rule, checks the constraints and conditions to determine
   * the possible range of input criteria which would be satisfied by the rule.
   * The rule must be a granular rule to be introspected.
   * @param rule The rule to evaluate.
   * @throws RuleTypeError if the rule is not granular
   */
  introspect<T>(rule: Rule): CriteriaRange<T>[] {
    // The ruleset needs to be granular for this operation to work
    if (!this._objectDiscovery.isGranular(rule)) {
      throw new RuleTypeError(
        "Provided rule not granular, a granular rule is required"
      );
    }

    const conditions =
      rule.conditions instanceof Array ? rule.conditions : [rule.conditions];

    // Then we map each result to the condition that produces
    // it to create a map of results to conditions
    const conditionMap = new Map<T, Condition[]>();
    for (const condition of conditions) {
      const result = condition.result;
      const data = conditionMap.get(result) ?? [];
      if (!data.length) {
        conditionMap.set(result, data);
      }

      data.push(condition);
    }

    // Using this information we can build the skeleton of the introspected criteria range
    const criteriaRange: CriteriaRange<T>[] = [];
    for (const result of conditionMap.keys()) {
      criteriaRange.push({
        type: result,
        options: [],
        isDefault: false,
      });
    }
    // Assign the default result to the criteria range
    if ("default" in rule && undefined !== rule.default) {
      criteriaRange.push({
        type: rule.default,
        options: null,
        isDefault: true,
      });
    }

    // For we need to populate each item in the `criteriaRange` with
    // the possible range of input values (in the criteria) which
    // would resolve to the given result. Rules are recursive.
    return this.resolveCriteriaRanges(criteriaRange, conditionMap);
  }

  /**
   * Populates the criteria range options with the possible range of input values
   * @param criteriaRanges The criteria range to populate.
   * @param conditionMap The map of results to conditions.
   * @param parentType The type of the parent condition.
   * @param depth The current recursion depth.
   */
  private resolveCriteriaRanges<T>(
    criteriaRanges: CriteriaRange<T>[],
    conditionMap: Map<T, Condition[]>,
    parentType: ConditionType = null,
    depth: number = 0
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
        let criteriaRangeItem = criteriaRanges.find((c) => c.type == result);

        criteriaRangeItem = this.populateCriteriaRangeOptions<T>(
          criteriaRangeItem,
          condition,
          depth,
          parentType
        );

        // Iterate over each property of the condition
        for (const node of condition[type]) {
          if (this._objectDiscovery.isCondition(node)) {
            const condition = node as Condition;
            criteriaRangeItem = this.resolveCriteriaRanges<T>(
              [criteriaRangeItem],
              new Map<T, Condition[]>([[result, [condition]]]),
              type,
              depth + 1
            ).pop();
          }

          // Update the original set of criteria range objects
          // with the updated criteria range object
          const index = criteriaRanges.findIndex((c) => c.type == result);
          criteriaRanges[index] = criteriaRangeItem;
        }
      }
    }

    return criteriaRanges;
  }

  /**
   * Updates a criteria range entry based on the constraint and condition type.
   * @param criteriaRange The criteria range entry to update.
   * @param condition The condition to update the criteria range entry with.
   * @param depth The current recursion depth.
   * @param parentType The type of the parent condition.
   */
  private populateCriteriaRangeOptions<T>(
    criteriaRange: CriteriaRange<T>,
    condition: Condition,
    depth: number,
    parentType?: ConditionType
  ): CriteriaRange<T> {
    const type = this._objectDiscovery.conditionType(condition);
    const options = new Map<string, Record<string, unknown>>();

    for (const node of condition[type]) {
      if (!this._objectDiscovery.isConstraint(node)) {
        continue;
      }

      const constraint = node as Constraint;

      // Check if we already have an entry with the same field
      // and if so, update it instead of creating a new one
      let option = options.get(constraint.field) ?? {};
      option = this.updateCriteriaRangeOptions(option, constraint, type);
      options.set(constraint.field, option);
    }

    if ("any" === type) {
      Array.from(options.values()).forEach(
        (option) =>
          (criteriaRange = this.addOptionToCriteriaRange<T>(
            type,
            parentType,
            criteriaRange,
            option,
            depth
          ))
      );
    }

    if ("all" === type) {
      criteriaRange = this.addOptionToCriteriaRange<T>(
        type,
        parentType,
        criteriaRange,
        Array.from(options.values()).reduce((prev, curr) => {
          for (const [key, value] of Object.entries(curr)) {
            prev[key] = prev.hasOwnProperty(key)
              ? [prev[key], value].flat()
              : value;
          }

          return prev;
        }, {}),
        depth
      );
    }

    return criteriaRange;
  }

  /**
   * Updates a criteria range option based on the constraint and condition type.
   * @param option The option to update.
   * @param constraint The constraint to update the option with.
   * @param type The current condition type.
   */
  private updateCriteriaRangeOptions(
    option: Record<string, unknown>,
    constraint: Constraint,
    type: ConditionType
  ) {
    if (!option.hasOwnProperty(constraint.field)) {
      // When condition is an all, we need to create a new object in the criteria range
      // options and add all the possible inputs which would satisfy the condition.
      if (type === "all") {
        switch (constraint.operator) {
          case "==":
          case "in":
            option[constraint.field] = constraint.value;
            break;
          case "!=":
          case ">":
          case "<":
          case ">=":
          case "<=":
          case "not in":
          case "contains":
          case "contains any":
            option[constraint.field] = {
              operator: constraint.operator,
              value: constraint.value,
            };
            break;
        }

        return option;
      }

      // When condition is an any, we need to create a new object in the criteria range
      // options for each criterion in the condition and add all the possible inputs
      // which would satisfy the criterion.
      if (type === "any") {
        switch (constraint.operator) {
          case "==":
          case "in":
            return { [constraint.field]: constraint.value };
          case "!=":
          case ">":
          case "<":
          case ">=":
          case "<=":
          case "not in":
          case "contains":
          case "contains any":
            return {
              [constraint.field]: {
                operator: constraint.operator,
                value: constraint.value,
              },
            };
        }
      }
    }

    // todo add for none
    if (type === "none") {
    }

    let value = constraint.value;

    switch (constraint.operator) {
      case "!=":
      case ">":
      case "<":
      case ">=":
      case "<=":
      case "not in":
      case "contains":
      case "contains any":
        value = { operator: constraint.operator, value: constraint.value };
        break;
    }

    option[constraint.field] = [option[constraint.field], value].flat();

    return option;
  }

  /**
   * todo bugged
   * Adds an option to a criteria range entry based on the condition type and parent type.
   * @param currentType The current condition type.
   * @param parentType The type of the parent condition.
   * @param entry The criteria range entry to update.
   * @param option The option to update the criteria range entry with.
   * @param depth The current recursion depth.
   */
  private addOptionToCriteriaRange<T>(
    currentType: ConditionType,
    parentType: ConditionType,
    entry: CriteriaRange<T>,
    option: Record<string, unknown>,
    depth: number
  ): CriteriaRange<T> {
    const lastIdx = entry.options.length - 1;

    // console.log(currentType, parentType, depth);

    // We create new objects in the options array
    if (currentType === "all" && parentType === "any") {
      this._introspectionSteps.push({
        currentType,
        parentType,
        depth,
        option,
      });
      // console.log(
      //   this._introspectionSteps[this._introspectionSteps.length - 1]
      // );

      entry.options.push(option);
      return entry;
    }

    // We add these options onto the last object in the options array
    if (
      (currentType === "any" && parentType === "any") ||
      (currentType === "any" && parentType === "all") ||
      (currentType === "all" && parentType === "all")
    ) {
      for (const [key, value] of Object.entries(option)) {
        entry.options[lastIdx][key] = entry.options[lastIdx].hasOwnProperty(key)
          ? [entry.options[lastIdx][key], value].flat()
          : value;
      }

      this._introspectionSteps.push({
        currentType,
        parentType,
        depth,
        option: entry.options[lastIdx],
      });
      // console.log(
      //   this._introspectionSteps[this._introspectionSteps.length - 1]
      // );

      return entry;
    }

    this._introspectionSteps.push({
      currentType,
      parentType,
      depth,
      option,
    });
    // console.log(this._introspectionSteps[this._introspectionSteps.length - 1]);

    entry.options.push(option);
    return entry;
  }
}
