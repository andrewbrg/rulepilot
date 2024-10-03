import {
  Rule,
  Condition,
  Constraint,
  CriteriaRange,
  ConditionType,
  IntrospectionResult,
} from "../types";
import { Logger } from "./logger";
import { RuleTypeError } from "../errors";
import { ObjectDiscovery } from "./object-discovery";

interface IntrospectionStep {
  parentType?: ConditionType;
  currType: ConditionType;
  depth: number;
  option: Record<string, unknown>;
  changes?: {
    key: string;
    value: unknown;
  }[];
}

/**
 * Introspection deals with the process of examining the constraints and conditions of a rule to determine all the
 * possible range of input criteria which would satisfy the rule along with the result of the rule that would be
 * produced by the criteria.
 */
export class Introspector {
  #objectDiscovery: ObjectDiscovery = new ObjectDiscovery();
  #steps: IntrospectionStep[];

  /**
   * Given a rule, checks the constraints and conditions to determine
   * the possible range of input criteria which would be satisfied by the rule.
   * The rule must be a granular rule to be introspected.
   * @param rule The rule to evaluate.
   * @throws RuleTypeError if the rule is not granular
   */
  introspect<T>(rule: Rule): IntrospectionResult<T> {
    // The ruleset needs to be granular for this operation to work
    if (!this.#objectDiscovery.isGranular(rule)) {
      throw new RuleTypeError(
        "The provided rule is not granular. A granular rule is required for Introspection"
      );
    }

    // Initialize a clean steps array each time we introspect
    this.#steps = [];

    const conditions =
      rule.conditions instanceof Array ? rule.conditions : [rule.conditions];

    // Then we map each result to the condition that produces
    // it to create a map of results to conditions
    const conditionMap = new Map<T, Condition[]>();
    for (const condition of conditions) {
      const data = conditionMap.get(condition.result) ?? [];
      if (!data.length) conditionMap.set(condition.result, data);

      data.push(condition);
    }

    // Using this information we can build the skeleton of the introspected criteria range
    const criteriaRange: CriteriaRange<T>[] = [];
    for (const result of conditionMap.keys()) {
      criteriaRange.push({ result, options: [] });
    }

    // For we need to populate each item in the `criteriaRange` with
    // the possible range of input values (in the criteria) which
    // would resolve to the given result. Rules are recursive.
    return {
      results: this.#resolveCriteriaRanges(criteriaRange, conditionMap),
      ...("default" in rule && undefined !== rule.default
        ? { default: rule.default }
        : {}),
    };
  }

  /**
   * Populates the criteria range options with the possible range of input values
   * @param criteriaRanges The criteria range to populate.
   * @param conditionMap The map of results to conditions.
   * @param parentType The type of the parent condition.
   * @param depth The current recursion depth.
   */
  #resolveCriteriaRanges<T>(
    criteriaRanges: CriteriaRange<T>[],
    conditionMap: Map<T, Condition[]>,
    parentType: ConditionType = null,
    depth: number = 0
  ): CriteriaRange<T>[] {
    // For each set of conditions which produce the same result
    for (const [result, conditions] of conditionMap) {
      // For each condition in that set
      for (const condition of conditions) {
        const type = this.#objectDiscovery.conditionType(condition);
        if (!type) continue;

        Logger.debug(`\nIntrospector: Introspecting result "${result}"`);

        // Find the criteria range object for the result
        let criteriaRangeItem = criteriaRanges.find((c) => c.result == result);
        criteriaRangeItem = this.#populateCriteriaRangeOptions<T>(
          criteriaRangeItem,
          condition,
          depth,
          parentType
        );

        // Iterate over each property of the condition
        for (const node of condition[type]) {
          if (this.#objectDiscovery.isCondition(node)) {
            const condition = node as Condition;
            criteriaRangeItem = this.#resolveCriteriaRanges<T>(
              [criteriaRangeItem],
              new Map<T, Condition[]>([[result, [condition]]]),
              type,
              depth + 1
            ).pop();
          }

          // Update the original set of criteria range objects
          // with the updated criteria range object
          const index = criteriaRanges.findIndex((c) => c.result == result);
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
  #populateCriteriaRangeOptions<T>(
    criteriaRange: CriteriaRange<T>,
    condition: Condition,
    depth: number,
    parentType?: ConditionType
  ): CriteriaRange<T> {
    const type = this.#objectDiscovery.conditionType(condition);
    const options = new Map<string, Record<string, unknown>>();

    for (const node of condition[type]) {
      if (!this.#objectDiscovery.isConstraint(node)) {
        continue;
      }

      const constraint = node as Constraint;

      Logger.debug(
        `Introspector: Processing "${constraint.field} (${constraint.operator})" in "${type}" condition`
      );

      // Check if we already have an entry with the same field
      // and if so, update it instead of creating a new one
      let option = options.get(constraint.field) ?? {};
      option = this.#updateCriteriaRangeOptions(option, constraint, type);
      options.set(constraint.field, option);
    }

    if (["any", "none"].includes(type)) {
      Array.from(options.values()).forEach((option) => {
        criteriaRange = this.#addOptionToCriteriaRange<T>(
          type,
          parentType,
          criteriaRange,
          option,
          depth
        );

        // Debug the last introspection
        Logger.debug("Introspector: Step complete", this.lastStep);
      });
    }

    if ("all" === type) {
      criteriaRange = this.#addOptionToCriteriaRange<T>(
        type,
        parentType,
        criteriaRange,
        Array.from(options.values()).reduce((prev, curr) => {
          for (const [key, value] of Object.entries(curr)) {
            prev[key] = prev.hasOwnProperty(key)
              ? [...new Set([prev[key], value].flat())]
              : value;
          }

          return prev;
        }, {}),
        depth
      );

      // Debug the last introspection
      Logger.debug("Introspector: Step complete", this.lastStep);
    }

    return criteriaRange;
  }

  /**
   * Updates a criteria range option based on the constraint and condition type.
   * @param option The option to update.
   * @param constraint The constraint to update the option with.
   * @param type The current condition type.
   */
  #updateCriteriaRangeOptions(
    option: Record<string, unknown>,
    constraint: Constraint,
    type: ConditionType
  ): Record<string, unknown> {
    // We need to clone the constraint because we will be modifying it
    const c = { ...constraint };

    // We can consider a 'None' as a not 'All' and flip all the operators
    // To be done on any 'None' type condition or on any child
    // of a 'None' type condition.
    if (type === "none" || this.#isCurrentStepChildOf("none")) {
      switch (c.operator) {
        case "==":
          c.operator = "!=";
          break;
        case "!=":
          c.operator = "==";
          break;
        case ">":
          c.operator = "<=";
          break;
        case "<":
          c.operator = ">=";
          break;
        case ">=":
          c.operator = "<";
          break;
        case "<=":
          c.operator = ">";
          break;
        case "in":
          c.operator = "not in";
          break;
        case "not in":
          c.operator = "in";
          break;
        case "contains":
          c.operator = "not contains";
          break;
        case "not contains":
          c.operator = "contains";
          break;
        case "contains any":
          c.operator = "not contains any";
          break;
        case "not contains any":
          c.operator = "contains any";
          break;
        case "matches":
          c.operator = "not matches";
          break;
        case "not matches":
          c.operator = "matches";
          break;
      }
    }

    if (!option.hasOwnProperty(c.field)) {
      // When condition is an all, we need to create a new object in the criteria range
      // options and add all the possible inputs which would satisfy the condition.
      if (type === "all" || type === "none") {
        switch (c.operator) {
          case "==":
          case "in":
            option[c.field] = c.value;
            break;
          default:
            option[c.field] = {
              operator: c.operator,
              value: c.value,
            };
            break;
        }

        return option;
      }

      // When condition is an any, we need to create a new object in the criteria range
      // options for each criterion in the condition and add all the possible inputs
      // which would satisfy the criterion.
      if ("any" === type) {
        switch (c.operator) {
          case "==":
          case "in":
            return { [c.field]: c.value };
          default:
            return {
              [c.field]: {
                operator: c.operator,
                value: c.value,
              },
            };
        }
      }
    }

    let value = c.value;
    if (c.operator !== "==") {
      value = { operator: c.operator, value: c.value };
    }

    option[c.field] = [...new Set([option[c.field], value].flat())];

    return option;
  }

  /**
   * Adds an option to a criteria range entry based on the condition type and parent type.
   * @param currType The current condition type.
   * @param parentType The type of the parent condition.
   * @param entry The criteria range entry to update.
   * @param option The option to update the criteria range entry with.
   * @param depth The current recursion depth.
   */
  #addOptionToCriteriaRange<T>(
    currType: ConditionType,
    parentType: ConditionType,
    entry: CriteriaRange<T>,
    option: Record<string, unknown>,
    depth: number
  ): CriteriaRange<T> {
    const lastIdx = entry.options.length - 1;

    // We create new objects in the options array
    if (["all", "none"].includes(currType) && parentType === "any") {
      // If we encounter this pair in a deeply nested condition we need to clone
      // the last option and add the options from the all by either appending
      // them if the key is new, or replacing the 'any' with the new values.
      if (depth > 1) {
        // We should start based on the last option added
        const baseOption = { ...entry.options[entry.options.length - 1] };

        // If the previous step added anything to the base option then we must first
        // remove these changes. For condition types of 'Any' or 'None' a step
        // is created for each property in the condition. Therefore, we must
        // remove the changes from step(s) which are at the same depth of
        // the last step.
        if (this.lastStep?.changes && this.lastStep.changes.length) {
          const depth = this.lastStep.depth;

          const steps = [...this.#steps];
          let step = steps.pop();

          while (step?.depth === depth) {
            for (const change of step.changes) {
              if (baseOption[change.key] === change.value) {
                delete baseOption[change.key];
              }

              if (Array.isArray(baseOption[change.key])) {
                baseOption[change.key] = (baseOption[change.key] as []).filter(
                  (o) =>
                    Array.isArray(change.value)
                      ? !change.value.includes(o)
                      : o != change.value
                );
              }
            }
            step = steps.pop();
          }
        }

        for (const [key, value] of Object.entries(option)) {
          baseOption[key] = baseOption.hasOwnProperty(key)
            ? [...new Set([baseOption[key], value].flat())]
            : value;
        }

        this.#steps.push({
          parentType,
          currType,
          depth,
          option: baseOption,
        });

        Logger.debug(
          `Introspector: + new option to criteria range based on last root parent"`
        );

        entry.options.push(baseOption);
        return entry;
      }

      this.#steps.push({ parentType, currType, depth, option });
      Logger.debug(`Introspector: + new option to criteria range`);

      entry.options.push(option);
      return entry;
    }

    // We add these options onto the last object in the options array
    if (
      ("any" === currType && "any" === parentType) ||
      ("any" === currType && ["all", "none"].includes(parentType)) ||
      (["all", "none"].includes(currType) &&
        ["all", "none"].includes(parentType))
    ) {
      const changes: IntrospectionStep["changes"] = [];
      for (const [key, value] of Object.entries(option)) {
        entry.options[lastIdx][key] = entry.options[lastIdx].hasOwnProperty(key)
          ? [...new Set([entry.options[lastIdx][key], value].flat())]
          : value;

        changes.push({ key, value });
      }

      this.#steps.push({
        parentType,
        currType,
        depth,
        option: entry.options[lastIdx],
        changes,
      });

      Logger.debug(`Introspector: Updating previous option with new values"`);

      return entry;
    }

    this.#steps.push({ parentType, currType, depth, option });
    Logger.debug(`Introspector: + new option to criteria range"`);

    entry.options.push(option);
    return entry;
  }

  /**
   * Checks if the current condition being introspected is the child
   * of some parent condition with a given type.
   * @param parentType The type of the parent condition.
   */
  #isCurrentStepChildOf(parentType: ConditionType): boolean {
    if (!this.#steps?.length) {
      return false;
    }

    // Clone the steps array so that we can pop items off it
    const steps = [...this.#steps];
    let step = steps.pop();

    // Check ancestors until we reach the first root condition
    while (step?.depth >= 0) {
      if (step.currType === parentType || step.parentType === parentType)
        return true;

      step = steps.pop();
    }

    return false;
  }

  /** Returns the last step in the introspection process. */
  get lastStep(): IntrospectionStep | null {
    return this.#steps?.length ? this.#steps[this.#steps.length - 1] : null;
  }
}
