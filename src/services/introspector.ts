import {
  Rule,
  Condition,
  Constraint,
  WithRequired,
  CriteriaRange,
  ConditionType,
  IntrospectionResult,
} from "../types";
import { Logger } from "./logger";
import { Evaluator } from "./evaluator";
import { RuleTypeError } from "../errors";
import { ObjectDiscovery } from "./object-discovery";

interface IntrospectionStep {
  parentType?: ConditionType;
  currType: ConditionType;
  depth: number;
  option: Record<string, unknown>;
  changes?: { key: string; value: unknown }[];
}

interface SubRuleResult {
  parent: Condition;
  subRule: any;
}

/**
 * Introspection deals with the process of examining the constraints and conditions of a rule to determine all the
 * possible range of input criteria which would satisfy the rule along with the result of the rule that would be
 * produced by the criteria.
 */
export class Introspector {
  #evaluator: Evaluator = new Evaluator();
  #objectDiscovery: ObjectDiscovery = new ObjectDiscovery();
  #steps: IntrospectionStep[];

  intrNew<R>(
    rule: Rule,
    constraint: Constraint,
    subjects: string[]
  ): IntrospectionResult<R> {
    // The ruleset needs to be granular for this operation to work
    if (!this.#objectDiscovery.isGranular(rule)) {
      throw new RuleTypeError("Introspection requires granular rules.");
    }

    // We care about all the possible values for the subjects which will satisfy
    // the rule if the rule is tested against the constraint provided.

    // First step is to simplify the rule:
    // 1. Make sure the rule conditions is an array.
    // 2. Convert any 'none' conditions to an 'all' and reverse operators of all children till the bottom.
    // 3. Remove all constraints which are not relevant to the subjects provided.
    rule.conditions = this.#asArray(rule.conditions);
    for (let i = 0; i < rule.conditions.length; i++) {
      rule.conditions[i] = this.#reverseNoneToAll(rule.conditions[i]);
      rule.conditions[i] = this.#removeIrrelevantConstraints(
        rule.conditions[i],
        [...subjects, constraint.field]
      );
    }

    // We then need to extract all sub-rules from the main rule
    let subRuleResults: SubRuleResult[] = [];
    for (const condition of rule.conditions) {
      subRuleResults = subRuleResults.concat(this.#extractSubRules(condition));
    }

    // console.log("boom", JSON.stringify(subRuleResults));

    // We then create a new version of the rule without any of the sub-rules
    let ruleConditions: Condition[] = [];
    for (let i = 0; i < rule.conditions.length; i++) {
      ruleConditions.push(this.#removeAllSubRules(rule.conditions[i]));
    }

    // console.log("bam", JSON.stringify(ruleConditions));

    // Any further introspection will be done on the new rule and the sub-rules extracted
    // At this point the search becomes as follows: What are the possible values for the
    // subjects which will satisfy the rule if the rule is tested against the constraint provided.

    // If each rule has a constraint in it which matches the type of one of the constraint we have, then
    // we need to evaluate the rule against the constraint and only consider the rule if it passes.

    // For the new rule
    ruleConditions = ruleConditions.filter((condition) => {
      return this.#hasConstraintField(constraint.field, condition)
        ? this.#evaluator.evaluate(
            { conditions: [condition] },
            { [constraint.field]: constraint.value }
          )
        : true;
    });

    // For the sub-rules
    // When evaluating the sub-rule, we need to first make sure the parent condition passes
    // before we can evaluate the sub-rule, otherwise we can discard the sub-rule entirely.
    subRuleResults = subRuleResults.filter((rule) => {});

    console.log("tam", JSON.stringify(ruleConditions));

    // At this point the task has been simplified to it's maximum capacity. We can now introspect each
    // rule and sub-rule remaining to determine the possible range of input criteria which would satisfy
    // the rule. These criteria will match the subjects provided to this function.

    // If the condition passes the check, we know we have subjects in the condition which we should return

    // If the condition fails the check but contains the constraint, it means we want to

    // this condition against the constraint we have. If the condition passes the constraint

    return null;
  }

  /**
   * Reverses all 'none' conditions to 'all' and flips the operators of all children.
   * @param condition The condition to reverse.
   * @param shouldFlip A flag to indicate if the operators should be flipped.
   */
  #reverseNoneToAll(
    condition: Condition,
    shouldFlip: boolean = false
  ): Condition {
    const type = this.#objectDiscovery.conditionType(condition);
    if ("none" === type) shouldFlip = !shouldFlip;

    // Iterate each node in the condition
    for (let i = 0; i < condition[type].length; i++) {
      let node = condition[type][i];

      // If the node is a condition, check if we need to reverse it
      if (shouldFlip && this.#objectDiscovery.isConstraint(node)) {
        node = this.#flipConstraintOperator(node as Constraint);
      }

      // If the node is a condition, recurse
      if (this.#objectDiscovery.isCondition(node)) {
        node = this.#reverseNoneToAll(node as Condition, shouldFlip);
      }
    }

    if (shouldFlip) {
      condition["all"] = condition[type];
      delete condition[type];
    }

    return this.#stripNullProps(condition);
  }

  /**
   * Removes all constraints which are not relevant to the subjects provided.
   * @param condition The condition to remove irrelevant constraints from.
   * @param toKeep The subjects to keep.
   */
  #removeIrrelevantConstraints(
    condition: Condition,
    toKeep: string[]
  ): Condition {
    const type = this.#objectDiscovery.conditionType(condition);

    // Iterate each node in the condition
    for (let i = 0; i < condition[type].length; i++) {
      let node = condition[type][i];

      // If the node is a condition, check if we need to reverse it
      const isConstraint = this.#objectDiscovery.isConstraint(node);
      if (isConstraint && !toKeep.includes(node["field"])) {
        delete condition[type][i];
      }

      // If the node is a condition, recurse
      if (this.#objectDiscovery.isCondition(node)) {
        node = this.#removeIrrelevantConstraints(node as Condition, toKeep);
      }
    }

    return this.#stripNullProps(condition);
  }

  /**
   * Flips the operator of a constraint.
   * @param c The constraint to flip the operator of.
   */
  #flipConstraintOperator(c: Constraint): Constraint {
    if ("==" === c.operator) {
      c.operator = "!=";
      return c;
    }
    if ("!=" === c.operator) {
      c.operator = "==";
      return c;
    }
    if (">" === c.operator) {
      c.operator = "<=";
      return c;
    }
    if ("<" === c.operator) {
      c.operator = ">=";
      return c;
    }
    if (">=" === c.operator) {
      c.operator = "<";
      return c;
    }
    if ("<=" === c.operator) {
      c.operator = ">";
      return c;
    }
    if ("in" === c.operator) {
      c.operator = "not in";
      return c;
    }
    if ("not in" === c.operator) {
      c.operator = "in";
      return c;
    }
    if ("contains" === c.operator) {
      c.operator = "not contains";
      return c;
    }
    if ("not contains" === c.operator) {
      c.operator = "contains";
      return c;
    }
    if ("contains any" === c.operator) {
      c.operator = "not contains any";
      return c;
    }
    if ("not contains any" === c.operator) {
      c.operator = "contains any";
      return c;
    }
    if ("matches" === c.operator) {
      c.operator = "not matches";
      return c;
    }
    if ("not matches" === c.operator) {
      c.operator = "matches";
      return c;
    }

    return c;
  }

  /**
   * Removes all null properties from an object.
   * @param obj The object to remove null properties from.
   * @param defaults The default values to remove.
   */
  #stripNullProps(
    obj: Record<string, any>,
    defaults: any[] = [undefined, null, NaN, ""]
  ) {
    if (defaults.includes(obj)) return;

    if (Array.isArray(obj))
      return obj
        .map((v) =>
          v && typeof v === "object" ? this.#stripNullProps(v, defaults) : v
        )
        .filter((v) => !defaults.includes(v));

    return Object.entries(obj).length
      ? Object.entries(obj)
          .map(([k, v]) => [
            k,
            v && typeof v === "object" ? this.#stripNullProps(v, defaults) : v,
          ])
          .reduce(
            (a, [k, v]) => (defaults.includes(v) ? a : { ...a, [k]: v }),
            {}
          )
      : obj;
  }

  /**
   * Extracts all sub-rules from a condition.
   * @param condition The condition to extract sub-rules from.
   * @param results The sub-conditions result set
   * @param root The root condition which holds the condition to extract sub-rules from.
   */
  #extractSubRules(
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
          parent: this.#removeAllSubRules(root),
          subRule: this.#removeAllSubRules(node),
        });

        // Recursively find sub-rules in the sub-rule
        for (const element of this.#asArray(node)) {
          // Ignore constraints
          if (!this.#objectDiscovery.isCondition(element)) continue;
          results = this.#extractSubRules(element, results, root);
        }

        // Do not re-process as a condition
        continue;
      }

      // If the node is a condition, recurse
      if (this.#objectDiscovery.isCondition(node)) {
        results = this.#extractSubRules(node, results, root);
      }
    }

    return results;
  }

  /**
   * Remove the provided sub-rule needle from the haystack condition
   * @param node The node to remove.
   * @param haystack The condition to search in and remove the sub-rule from.
   */
  #removeNode(node: Record<string, any>, haystack: Condition): Condition {
    // Clone the condition so that we can modify it
    const clone = JSON.parse(JSON.stringify(haystack));

    // Iterate over each node in the condition
    const type = this.#objectDiscovery.conditionType(clone);
    for (let i = 0; i < clone[type].length; i++) {
      // Check if the current node is the node we are looking for
      if (JSON.stringify(clone[type][i]) == JSON.stringify(node)) {
        // Remove the node from the cloned object
        clone[type].splice(i, 1);

        // If the node is now empty, we can prune it
        if (Array.isArray(clone[type]) && !clone[type].length) return null;
        continue;
      }

      // If the node is a condition, recurse
      if (this.#objectDiscovery.isCondition(clone[type][i])) {
        clone[type][i] = this.#removeNode(node, clone[type][i]);
      }
    }

    return this.#stripNullProps(clone);
  }

  /**
   * Removes all subrules from the provided condition.
   * @param haystack The condition to search in and remove all sub-rules from.
   */
  #removeAllSubRules(haystack: Condition): Condition {
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
        if (Array.isArray(clone[type]) && !clone[type].length) return null;
        continue;
      }

      // If the node is a condition, recurse
      if (this.#objectDiscovery.isCondition(clone[type][i])) {
        clone[type][i] = this.#removeAllSubRules(clone[type][i]);
      }
    }

    return this.#stripNullProps(clone);
  }

  #hasConstraintField(field: string, haystack: Condition): boolean {
    // Iterate over each node in the condition
    const type = this.#objectDiscovery.conditionType(haystack);
    for (let i = 0; i < haystack[type].length; i++) {
      const node = haystack[type][i];

      // If the node is a constraint, check if it has the field we are looking for
      if (this.#objectDiscovery.isConstraint(node) && node.field === field) {
        return true;
      }

      // If the node is a condition, recurse
      if (this.#objectDiscovery.isCondition(node)) {
        return this.#hasConstraintField(field, node);
      }
    }

    return false;
  }

  /**
   * Given a rule, checks the constraints and conditions to determine
   * the possible range of input criteria which would be satisfied by the rule.
   * The rule must be a granular rule to be introspected.
   * @param rule The rule to evaluate.
   * @param constraint The constraint to introspect against.
   * @param subjects The subjects to introspect for.
   * @throws RuleTypeError if the rule is not granular
   */
  introspect<R>(
    rule: Rule,
    constraint: Constraint,
    subjects: string[]
  ): IntrospectionResult<R> {
    // The ruleset needs to be granular for this operation to work
    if (!this.#objectDiscovery.isGranular(rule)) {
      throw new RuleTypeError("Introspection requires granular rules.");
    }

    this.intrNew(rule, constraint, subjects);

    // Find any conditions which contain sub-rules
    // We extract each sub-rule along with the parent rule that needs to pass in order
    // for the subrule to be applicable.
    // todo this is leaving the original sub rule in the parent rule
    let subRuleResults: SubRuleResult[] = [];
    for (const condition of this.#asArray(rule.conditions)) {
      subRuleResults = subRuleResults.concat(
        this.#findSubRules(condition, condition)
      );
    }

    let results = this.#introspectRule<R>(rule, constraint, subjects);
    //console.log(JSON.stringify(results));

    // Construct a new rule from each sub-rule result
    for (const subRuleResult of subRuleResults) {
      const res = this.#flatten(subRuleResult.parent);
      for (const condition of this.#asArray(subRuleResult.subRule.conditions)) {
        res.all.push(condition);
      }

      // console.log(
      //   `Rule ${subRuleResult.subRule.result}:`,
      //   JSON.stringify({
      //     conditions: {
      //       ...res,
      //       result: subRuleResult.subRule.result,
      //     },
      //   })
      // );

      results = results.concat(
        this.#introspectRule<R>(
          {
            conditions: {
              ...res,
              result: subRuleResult.subRule.result,
            },
          },
          constraint,
          subjects
        )
      );
    }

    return {
      results,
      ...("default" in rule && undefined !== rule.default
        ? { default: rule.default }
        : {}),
    };
  }

  /**
   * Runs the introspection process on a rule to determine the possible range of input criteria
   * @param rule The rule to introspect.
   * @param constraint The constraint to introspect against.
   * @param subjects The subjects to introspect for.
   */
  #introspectRule<R>(
    rule: Rule,
    constraint: Constraint,
    subjects: string[]
  ): CriteriaRange<R>[] {
    // Initialize a clean steps array each time we introspect
    this.#steps = [];
    const conditions = this.#stripAllSubRules(this.#asArray(rule.conditions));

    // Then we map each result to the condition that produces
    // it to create a map of results to conditions
    const conditionMap = new Map<R, Condition[]>();
    for (const condition of conditions) {
      const data = conditionMap.get(condition.result) ?? [];
      if (!data.length) conditionMap.set(condition.result, data);

      data.push(condition);
    }

    // Using this information we can build the skeleton of the introspected criteria range
    const criteriaRange: CriteriaRange<R>[] = [];
    for (const result of conditionMap.keys()) {
      criteriaRange.push({ result, options: [] });
    }

    // We need to populate each item in the `criteriaRange` with
    // the possible range of input values (in the criteria) which
    // would resolve to the given result. Rules are recursive.
    return this.#resolveCriteriaRanges(criteriaRange, conditionMap);
  }

  /**
   * Recursively finds all sub-rules in a condition.
   * @param condition The condition to search.
   * @param root The root condition which holds the condition to search.
   * @param results The results array to populate.
   */
  #findSubRules(
    condition: Condition,
    root: Condition,
    results: SubRuleResult[] = []
  ): SubRuleResult[] {
    // Find the type of the condition
    const type = this.#objectDiscovery.conditionType(condition);

    // Iterate each node in the condition
    for (const node of condition[type]) {
      if (this.#objectDiscovery.isConditionWithResult(node)) {
        results.push({
          parent: this.#removeSubRule(node, root),
          subRule: {
            conditions: this.#stripAllSubRules(node),
            result: node.result,
          },
        });

        // Recursively find sub-rules within the sub-rule
        for (const condition of this.#asArray(node)) {
          results = this.#findSubRules(condition, root, results);
        }

        return results;
      }

      // Recursively find sub-rules within the condition
      if (this.#objectDiscovery.isCondition(node)) {
        results = this.#findSubRules(node, root, results);
      }
    }

    return results;
  }

  /**
   * Remove the provided sub-rule needle from the haystack condition
   * @param needle The sub-rule to remove.
   * @param haystack The condition to search in and remove the sub-rule from.
   */
  #removeSubRule(
    needle: WithRequired<Condition, "result">,
    haystack: Condition
  ): Condition {
    // Clone the root condition so that we can modify it
    const clone = JSON.parse(JSON.stringify(haystack));

    // Find the type of the condition
    const type = this.#objectDiscovery.conditionType(clone);

    // Iterate over each node in the condition
    for (let i = 0; i < clone[type].length; i++) {
      const node = clone[type][i];

      // If the node is a condition, recurse
      if (this.#objectDiscovery.isCondition(node)) {
        clone[type][i] = this.#removeSubRule(needle, node);
        continue;
      }

      // If the node is a sub-rule
      if (this.#objectDiscovery.isConditionWithResult(node)) {
        if (!this.existsIn(needle, node)) {
          clone[type].splice(i, 1);
          continue;
        }

        // Otherwise, recurse into the sub-rule
        const conditions = this.#asArray(node);
        for (let j = 0; j < conditions.length; j++) {
          clone[type][i].rule.conditions[j] = this.#removeSubRule(
            needle,
            conditions[j]
          );
        }
      }
    }

    return clone;
  }

  /**
   * Checks if a sub-rule exists in a given haystack.
   * @param needle The sub-rule to search for.
   * @param haystack The condition to search in.
   * @param found A flag to indicate if the sub-rule has been found.
   */
  existsIn(
    needle: WithRequired<Condition, "result">,
    haystack: unknown,
    found: boolean = false
  ): boolean {
    if (found) return true;

    // Otherwise, recurse into the sub-rule
    for (const node of this.#asArray(haystack)) {
      // If the node is a sub-rule
      if (this.#objectDiscovery.isConditionWithResult(node)) {
        // Check if it is the sub-rule we are looking for
        if (JSON.stringify(needle) === JSON.stringify(node)) return true;
        // Otherwise, recurse into the sub-rule
        found = this.existsIn(needle, node, found);
      }

      // If the node is a condition, recurse
      if (this.#objectDiscovery.isCondition(node)) {
        const type = this.#objectDiscovery.conditionType(node);
        found = this.existsIn(needle, node[type], found);
      }
    }

    return found;
  }

  /**
   * Removes all sub-rules from a condition or array of conditions.
   * @param conditions The conditions to remove sub-rules from.
   */
  #stripAllSubRules<R = Condition | Condition[]>(conditions: R): R | undefined {
    // Clone the conditions array so that we can modify it
    const clone = JSON.parse(JSON.stringify(this.#asArray(conditions)));

    // Iterate over each condition in the array
    for (let i = 0; i < clone.length; i++) {
      // Find the type of the condition
      const type = this.#objectDiscovery.conditionType(clone[i]);

      // Iterate over each node in the condition
      for (let j = 0; j < clone[i][type].length; j++) {
        const node = clone[i][type][j];

        // If the node is a condition, recurse
        if (this.#objectDiscovery.isCondition(node)) {
          const res = this.#stripAllSubRules<Condition>(node);
          if (res) clone[i][type][j] = res;
          else clone[i][type].splice(j, 1);
        }

        // If the node is a sub-rule, remove it
        if (this.#objectDiscovery.isConditionWithResult(node))
          clone[i][type].splice(j, 1);
      }
    }

    return Array.isArray(conditions) ? (clone as R) : (clone[0] as R);
  }

  /**
   * Flattens a condition or set of conditions into a single object.
   * @param conditions The conditions to flatten.
   * @param result The result object to populate.
   */
  #flatten(
    conditions: Condition | Condition[],
    result: Condition = { all: [] }
  ): Condition {
    // Clone the conditions array so that we can modify it
    const clone = JSON.parse(JSON.stringify(this.#asArray(conditions)));

    for (const condition of clone) {
      const items = [];

      const type = this.#objectDiscovery.conditionType(condition);
      for (const node of condition[type]) {
        if (this.#objectDiscovery.isConditionWithResult(node)) {
          delete node.result;
          result = this.#flatten(node, result);
          continue;
        }

        items.push(node);
      }

      result.all.push({ [type]: items });
    }

    return result;
  }

  /**
   * Populates the criteria range options with the possible range of input values
   * @param criteriaRanges The criteria range to populate.
   * @param conditionMap The map of results to conditions.
   * @param parentType The type of the parent condition.
   * @param depth The current recursion depth.
   */
  #resolveCriteriaRanges<R>(
    criteriaRanges: CriteriaRange<R>[],
    conditionMap: Map<R, Condition[]>,
    parentType: ConditionType = null,
    depth: number = 0
  ): CriteriaRange<R>[] {
    // For each set of conditions which produce the same result
    for (const [result, conditions] of conditionMap) {
      // For each condition in that set
      for (const condition of conditions) {
        const type = this.#objectDiscovery.conditionType(condition);
        if (!type) continue;

        Logger.debug(`\nIntrospector: Introspecting result "${result}"`);

        // Find the criteria range object for the result
        let criteriaRangeItem = criteriaRanges.find((c) => c.result == result);
        criteriaRangeItem = this.#populateCriteriaRangeOptions<R>(
          criteriaRangeItem,
          condition,
          depth,
          parentType
        );

        // Iterate over each property of the condition
        for (const node of condition[type]) {
          if (this.#objectDiscovery.isCondition(node)) {
            const condition = node as Condition;
            criteriaRangeItem = this.#resolveCriteriaRanges<R>(
              [criteriaRangeItem],
              new Map<R, Condition[]>([[result, [condition]]]),
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
  #populateCriteriaRangeOptions<R>(
    criteriaRange: CriteriaRange<R>,
    condition: Condition,
    depth: number,
    parentType?: ConditionType
  ): CriteriaRange<R> {
    const type = this.#objectDiscovery.conditionType(condition);
    const options = new Map<string, Record<string, unknown>>();

    for (const node of condition[type]) {
      if (!this.#objectDiscovery.isConstraint(node)) continue;

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
        criteriaRange = this.#addOptionToCriteriaRange<R>(
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
      criteriaRange = this.#addOptionToCriteriaRange<R>(
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
  #addOptionToCriteriaRange<R>(
    currType: ConditionType,
    parentType: ConditionType,
    entry: CriteriaRange<R>,
    option: Record<string, unknown>,
    depth: number
  ): CriteriaRange<R> {
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
          `Introspector: + new option to criteria range based on last root parent`
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
    Logger.debug(`Introspector: + new option to criteria range`);

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

  /**
   * Converts a value to an array if it is not already an array.
   * @param value The value to convert.
   */
  #asArray<R = any>(value: R | R[]): R[] {
    return Array.isArray(value) ? value : [value];
  }

  /** Returns the last step in the introspection process. */
  get lastStep(): IntrospectionStep | null {
    return this.#steps?.length ? this.#steps[this.#steps.length - 1] : null;
  }
}
