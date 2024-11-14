import { Logger } from "./logger";
import { ObjectDiscovery } from "./object-discovery";
import { Rule, Condition, Constraint, IntrospectionResult } from "../types";

interface SubRuleResult {
  parent?: Condition;
  subRule: Condition;
}

interface ConditionResult {
  values?: Map<string, Constraint[]>;
  stop: boolean;
  void: boolean;
}

/**
 * Introspection deals with the process of examining the constraints and conditions of a rule to determine all the
 * possible range of input criteria which would satisfy the rule along with the result of the rule that would be
 * produced by the criteria.
 */
export class Introspector {
  #objectDiscovery: ObjectDiscovery = new ObjectDiscovery();

  introspect(
    rule: Rule,
    constraint: Omit<Constraint, "operator">,
    subjects: string[]
  ): IntrospectionResult {
    // We care about all the possible values for the subjects which will satisfy
    // the rule if the rule is tested against the constraint provided.

    // To proceed we must first clone the rule (to avoid modifying the original)
    rule = JSON.parse(JSON.stringify(rule));

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
    let subRules: SubRuleResult[] = [];
    for (const condition of rule.conditions) {
      subRules = subRules.concat(this.#extractSubRules(condition));
    }

    // We then create a new version of the rule without any of the sub-rules
    const conditions: Condition[] = [];
    for (let i = 0; i < rule.conditions.length; i++) {
      conditions.push(this.#removeAllSubRules(rule.conditions[i]));
    }

    subRules.forEach((rule) => {
      if (!rule.parent) {
        conditions.push(rule.subRule);
        return;
      }

      const result = rule.subRule.result;
      delete rule.parent.result;
      delete rule.subRule.result;

      conditions.push({ all: [rule.parent, rule.subRule], result });
    });

    // console.log("subRules", JSON.stringify(subRules));
    // console.log("conditions", JSON.stringify(conditions));

    // At this point the search becomes as follows: What are the possible values for the
    // subjects which will satisfy the rule if the rule is tested against the constraint provided.

    const results = {};

    // We introspect the conditions to determine the possible values for the subjects
    for (const condition of conditions) {
      const { values } = this.#introspectConditions(condition, constraint);
      if (!values) continue;

      const key = condition.result ?? "default";

      // Merge the results maintaining the uniqueness of the values
      for (const [field, constraints] of values.entries()) {
        if (!subjects.includes(field)) continue;

        const set = new Set([...(results[field] ?? [])]);
        for (const constraint of constraints) {
          set.add({ value: constraint.value, operator: constraint.operator });
        }

        if (set.size) {
          results[key] = {};
          results[key][field] = Array.from(set);
        }
      }
    }

    return results;
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
      if ("none" === type) {
        condition["all"] = condition[type];
        delete condition[type];
      }

      if ("any" === type) {
        condition["all"] = condition[type];
        delete condition[type];
      }
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

  /**
   * Converts a value to an array if it is not already an array.
   * @param value The value to convert.
   */
  #asArray<R = any>(value: R | R[]): R[] {
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Extracts all the possible combinations of criteria from the condition which are
   * self-consistent to the condition passing.
   * @param condition The condition to introspect.
   * @param input The constraint passed as an input to the introspection.
   * @param parentType The type of the parent condition.
   * @param parentResults The parent condition results.
   * @param depth The current recursion depth.
   */
  #introspectConditions(
    condition: Condition,
    input: Omit<Constraint, "operator">,
    parentType: keyof Condition = null,
    parentResults: Map<string, Constraint[]> = new Map(),
    depth: number = 0
  ): ConditionResult {
    // Prepare the lists
    const conditions: Condition[] = [];
    const groupedConst: Map<string, Constraint[]> = new Map();

    // Iterate over each node in the condition
    const type = this.#objectDiscovery.conditionType(condition);
    for (const node of condition[type]) {
      if (this.#objectDiscovery.isCondition(node)) {
        // Process the 'all' conditions before the 'any' conditions
        if ("all" === this.#objectDiscovery.conditionType(node))
          conditions.unshift(node);
        else conditions.push(node);
      }
      if (this.#objectDiscovery.isConstraint(node)) {
        this.#appendResult(groupedConst, node);
      }
    }

    const gap = "  ".repeat(depth);
    const msg =
      0 === depth
        ? `\nIntrospecting "${Logger.bold(type)}" condition`
        : `${gap}--> "${Logger.bold(type)}" condition`;
    Logger.debug(msg);

    // Iterate over all grouped constraints
    for (const [field, constraints] of groupedConst.entries()) {
      // Prepare the local results
      let candidates: Constraint[] = [];

      // Test the constraints and prepare the local results
      ////////////////////////////////////////////////////////////
      for (const c of constraints) {
        // Append to local results
        if ("any" === type) {
          const col = Logger.color(c.field, "g");
          const val = Logger.color(c.value, "y");
          const msg = ` ${gap}+ Adding local '${col}'${c.operator}'${val}'`;
          Logger.debug(msg, `(${Logger.color("pass", "g")})`);

          candidates.push(c);
        }

        if ("all" === type) {
          if (!this.test(candidates, input, c, depth)) {
            candidates = [];
            Logger.debug(` ${gap}- Clearing local candidates...`);
            break;
          }

          candidates.push(c);
        }
      }
      ////////////////////////////////////////////////////////////

      // Merge the local results with the parent results
      ////////////////////////////////////////////////////////////
      if (null === parentType) {
        for (const c of candidates) this.#appendResult(parentResults, c);
      }

      if ("any" === parentType) {
        if ("any" === type) {
          for (const c of candidates) this.#appendResult(parentResults, c);
        }

        if ("all" === type) {
          if (!candidates.length) {
            Logger.debug(`${gap}X Exiting...`);
            return { values: parentResults, stop: true, void: false };
          }

          for (const c of candidates) this.#appendResult(parentResults, c);
        }
      }

      if ("all" === parentType) {
        if ("any" === type) {
          const valid = [];
          for (const c of candidates) {
            const parentRes = parentResults.get(field) ?? [];
            if (this.test(parentRes, input, c, depth)) valid.push(c);
          }

          if (!valid.length) {
            Logger.debug(
              `${gap}${Logger.color("Exiting & Discarding results...", "r")}`
            );
            return { values: parentResults, stop: true, void: true };
          }

          for (const c of valid) this.#appendResult(parentResults, c);
        }

        if ("all" === type) {
          // We assume all constraints are valid until proven otherwise, however if the list is empty
          // we must say that no constraint has passed.
          let allPass = candidates.length > 0;
          for (const c of candidates) {
            const parentRes = parentResults.get(field) ?? [];
            if (!this.test(parentRes, input, c, depth)) allPass = false;
          }

          if (!allPass) {
            Logger.debug(
              `${gap}${Logger.color("Exiting & Discarding results...", "r")}`
            );
            return { values: parentResults, stop: true, void: true };
          }

          for (const c of candidates) {
            this.#appendResult(parentResults, c);
          }
        }
      }
      ////////////////////////////////////////////////////////////
    }

    // Log the results
    ////////////////////////////////////////////////////////////
    for (const [k, v] of parentResults.entries()) {
      const values = [];
      for (const c of v) {
        values.push(`${c.operator}${Logger.color(c.value, "y")}`);
      }

      const msg = ` ${gap}${Logger.color("* Candidates", "m")} `;
      Logger.debug(`${msg}${Logger.color(k, "g")}: [${values.join(", ")}]`);
    }
    ////////////////////////////////////////////////////////////

    // Sanitize the results
    ////////////////////////////////////////////////////////////
    for (const [field, constraints] of parentResults.entries()) {
      parentResults.set(field, this.sanitize(constraints, depth));
    }
    ////////////////////////////////////////////////////////////

    // Iterate over all conditions
    ////////////////////////////////////////////////////////////
    for (const c of conditions) {
      // Introspect the condition and append the results to the parent results
      const d = depth + 1;
      const res = this.#introspectConditions(c, input, type, parentResults, d);

      if (res.void) parentResults = new Map();
      else parentResults = res.values;

      if (res.stop)
        return { values: parentResults, stop: res.stop, void: res.void };
    }
    //////////////////////////////////////////

    return { values: parentResults, stop: false, void: false };
  }

  /**
   * Appends a constraint to the provided map based placing the constraint in a
   * group based on its field.
   * @param map The map to append the constraint to.
   * @param c The constraint to append.
   */
  #appendResult(map: Map<string, Constraint[]>, c: Constraint): void {
    const temp = map.get(c.field) ?? [];
    map.set(c.field, temp);

    // Do not add duplicate constraints
    if (temp.some((t) => JSON.stringify(t) === JSON.stringify(c))) return;

    temp.push(c);
  }

  /**
   * Given a list of valid candidates and the input used in the introspection, this method
   * tests a new constraint (item) returning true if the item is self-consistent with the
   * candidates and the input.
   *
   * Testing happens by considering each item in the list as linked by an AND
   * @param candidates The result candidates to test against.
   * @param input The constraint which was input to the introspection.
   * @param item The constraint item to test against the candidates.
   * @param depth The current recursion depth.
   */
  protected test(
    candidates: Constraint[],
    input: Omit<Constraint, "operator">,
    item: Constraint,
    depth: number
  ): boolean {
    // Filter out results which do not match the field of the constraint
    candidates = candidates.filter((r) => r.field === item.field);

    // Add the input constraint to the results (if it also matches the field)
    if (input.field === item.field) {
      candidates.push({ ...input, operator: "==" });
    }

    // Test that the constraint does not breach the results
    // The test constraint needs to be compared against all the results
    // and has to pass all the tests to be considered valid
    let result = true;
    for (const c of candidates) {
      let ops: any;

      // Extract the item properties to test with
      const { value, operator } = item;

      switch (c.operator) {
        case "==":
          /**
           *  c = (L == 500)
           *  L == 500
           *  L != !500
           *  L >= 500
           *  L <= 500
           *  L > 499
           *  L < 501
           *  L IN [500]
           *  L NOT IN [501, 502]
           */

          // Must be equal to the value
          if ("==" === operator && value !== c.value) result = false;

          // Item value must allow for constraint value to exist in item value range
          if ("<=" === operator && value < c.value) result = false;
          if (">=" === operator && value > c.value) result = false;

          // Item value must allow for constraint value to exist in item value range
          if ("<" === operator && value <= c.value) result = false;
          if (">" === operator && value >= c.value) result = false;

          // Item value cannot be equal to constraint value
          if ("!=" === operator && value === c.value) result = false;

          // One of the values in the item must match the candidate value
          if ("in" === operator) {
            if (!this.#asArray(value).some((val) => val === c.value))
              result = false;
          }

          // None of the values in the item must match the candidate value
          if ("not in" === operator) {
            if (this.#asArray(value).some((val) => val === c.value))
              result = false;
          }
          break;
        case "!=":
          /**
           *  c = (L != 500)
           *  L == !500
           *  L != any
           *  L >= any
           *  L <= any
           *  L > any
           *  L < any
           *  L IN [500, 502]
           *  L NOT IN [499,500]
           */

          // Must be different
          if ("==" === operator && value === c.value) result = false;

          // // Always pass
          // ops = ["!=", ">", ">=", "<", "<=", "not in"];
          // if (ops.includes(operator)) result = true;

          // One of the values in the item must NOT match the candidate value
          if ("in" === operator) {
            if (!this.#asArray(value).some((val) => val !== c.value))
              result = false;
          }
          break;
        case ">":
          /**
           *  c = (L > 500)
           *  L == 501↑
           *  L != any
           *  L >= any
           *  L <= 501↑
           *  L > any
           *  L < 502↑
           *  IN [501, 502]
           *  NOT IN [501, 502]
           */

          // Always pass ["!=", ">", ">=", "not in"]

          // Must be bigger than the value
          ops = ["==", "<="];
          if (ops.includes(operator) && value <= c.value) result = false;

          if ("<" === operator && Number(value) <= Number(c.value) + 2)
            result = false;

          // One of the values in the item must match the candidate value
          if ("in" === operator) {
            if (!this.#asArray(value).some((val) => val > c.value))
              result = false;
          }
          break;
        case "<":
          /**
           *  c = (L < 500)
           *  L == 499↓
           *  L != any
           *  L >= 499↓
           *  L <= any
           *  L > 498↓
           *  L < any
           *  IN [499, 500]
           */

          // Always pass ["!=", "<", "<=", "not in"]

          // Must be smaller than the value
          ops = ["==", ">="];
          if (ops.includes(operator) && value >= c.value) result = false;

          if (">" === operator && Number(value) >= Number(c.value) - 2)
            result = false;

          // One of the values in the item must match the candidate value
          if ("in" === operator) {
            if (!this.#asArray(value).some((val) => val < c.value))
              result = false;
          }
          break;
        case ">=":
          /**
           *  c = (L >= 500)
           *  L == 500↑
           *  L != any
           *  L >= any
           *  L <= 500↑
           *  L > any
           *  L < 501↑
           *  L IN [500, 501]
           */

          // Always pass ["!=", ">=", ">", "not in"]

          // Must be bigger than the value
          ops = ["==", "<="];
          if (ops.includes(operator) && value < c.value) result = false;

          if ("<" === operator && Number(value) < Number(c.value) + 1)
            result = false;

          // One of the values in the item must match the candidate value
          if ("in" === operator) {
            if (!this.#asArray(value).some((val) => val >= c.value))
              result = false;
          }
          break;
        case "<=":
          /**
           *  c = (L <= 500)
           *  L == 500↓
           *  L != any
           *  L >= 500↓
           *  L <= any
           *  L > 499↓
           *  L < any
           */

          // Always pass ["!=", "<=", "<", "not in"]

          // Must be smaller than the value
          ops = ["==", ">="];
          if (ops.includes(operator) && value > c.value) result = false;

          if (">" === operator && Number(value) > Number(c.value) - 1)
            result = false;

          // One of the values in the item must match the candidate value
          if ("in" === operator) {
            if (!this.#asArray(value).some((val) => val <= c.value))
              result = false;
          }
          break;
        case "in":
          /**
           *  c = (L [500,501)
           *  IN [500, 502]
           *  NOT IN [499, 500]
           */
          result = false;

          // At least 1 item from list must pass
          // For each item run the same checks as for the '==' operator
          for (const subVal of this.#asArray(c.value)) {
            // Must be equal to the value
            if ("==" === operator && value === subVal) {
              result = true;
            }

            // Item value must allow for constraint value to exist in item value range
            if ("<=" === operator && value >= subVal) {
              result = true;
            }
            if (">=" === operator && value <= subVal) {
              result = true;
            }

            // Item value must allow for constraint value to exist in item value range
            if ("<" === operator && value > subVal) {
              result = true;
            }
            if (">" === operator && value < subVal) {
              result = true;
            }

            // Item value cannot be equal to constraint value
            if ("!=" === operator && value !== subVal) {
              result = true;
            }
          }

          const inValues = this.#asArray(c.value);

          // One of the values in the item must match any candidate values
          if ("in" === operator) {
            if (this.#asArray(value).some((val) => inValues.includes(val)))
              result = true;
          }

          // One of the values in the item must NOT match any candidate values
          if ("not in" === operator) {
            if (this.#asArray(value).some((val) => !inValues.includes(val)))
              result = true;
          }
          break;
        case "not in":
          /**
           *  c = (L NOT IN [500,501)
           *  IN [499, 501]
           *  NOT IN [500, 499]
           */
          result = true;

          // All items from list must pass
          for (const subVal of this.#asArray(c.value)) {
            // Must be different
            if ("==" === operator && value === subVal) {
              result = false;
            }
          }

          const notInValues = this.#asArray(c.value);

          // One of the values in the item must NOT match any candidate values
          if ("in" === operator) {
            if (this.#asArray(value).some((val) => !notInValues.includes(val)))
              result = true;
          }
          break;
        // case "contains":
        //   break;
        // case "not contains":
        //   break;
        // case "contains any":
        //   break;
        // case "not contains any":
        //   break;
        // case "matches":
        //   break;
        // case "not matches":
        //   break;
      }
    }

    // Prepare the log
    const gap = "  ".repeat(depth);
    const col = Logger.color(item.field, "g");
    const val = Logger.color(item.value, "y");
    const pass = Logger.color("pass", "g");
    const fail = Logger.color("fail", "r");

    const msg = ` ${gap}> Testing '${col}'${item.operator}'${val}'`;
    Logger.debug(msg, `(${result ? pass : fail})`);

    // Return the result
    return result;
  }

  /**
   * Takes a list of constraints which represent the possible values for a field which satisfy a rule
   * and sanitizes the list to remove any constraints which are redundant. This method will convert the
   * list of constraints to the smallest possible list of constraints which still represent the same
   * possible values for the field.
   *
   * Sanitization happens by considering each item in the list as linked by an OR
   * @param constraints The constraints to sanitize.
   * @param depth The current recursion depth.
   */
  protected sanitize(constraints: Constraint[], depth: number): Constraint[] {
    // Create a results list which we can modify
    let results = JSON.parse(JSON.stringify(constraints));

    // Clone the constraints so that we can modify them in needed
    for (const sub of JSON.parse(JSON.stringify(constraints))) {
      const op = sub.operator;
      const val = sub.value;

      // Clone the list and iterate again
      for (const c of JSON.parse(JSON.stringify(constraints))) {
        // If the clone and the subject are the same, skip
        if (JSON.stringify(c) === JSON.stringify(sub)) continue;

        if (">=" === op) {
          if ("==" === c.operator && c.value === val) {
            return this.sanitize(this.#removeItem(c, results), depth);
          }

          if (">" === c.operator) {
            // >=500, >500+ (remove >500+)
            if (c.value >= val) results = this.#removeItem(c, results);
            // >=500, >499- (remove >=500)
            if (c.value < val) results = this.#removeItem(sub, results);

            return this.sanitize(results, depth);
          }

          if (">=" === c.operator) {
            // >=500, >=500+ (remove >=500+)
            if (c.value >= val) results = this.#removeItem(c, results);
            // >=500, >=499- (remove >=500)
            if (c.value < val) results = this.#removeItem(sub, results);

            return this.sanitize(results, depth);
          }
        }

        if ("<=" === op) {
          if ("==" === c.operator && c.value === val) {
            return this.sanitize(this.#removeItem(c, results), depth);
          }

          if ("<" === c.operator) {
            // <=500, <500- (remove <500-)
            if (c.value <= val) results = this.#removeItem(c, results);
            // <=500, <501+ (remove >=500)
            if (c.value > val) results = this.#removeItem(sub, results);

            return this.sanitize(results, depth);
          }

          if ("<=" === c.operator) {
            // <=500, <500- (remove <500-)
            if (c.value <= val) results = this.#removeItem(c, results);
            // <=500, <501+ (remove >=500)
            if (c.value > val) results = this.#removeItem(sub, results);

            return this.sanitize(results, depth);
          }
        }

        if (">" === op) {
          if ("==" === c.operator && c.value > val) {
            return this.sanitize(this.#removeItem(c, results), depth);
          }

          if ("==" === c.operator && c.value === val) {
            results = this.#removeItem(c, this.#removeItem(sub, results));
            results.push({ ...sub, operator: ">=" });

            return this.sanitize(results, depth);
          }

          if (">" === c.operator && c.value >= val) {
            return this.sanitize(this.#removeItem(c, results), depth);
          }
        }

        if ("<" === op) {
          if ("==" === c.operator && c.value < val) {
            return this.sanitize(this.#removeItem(c, results), depth);
          }

          if ("==" === c.operator && c.value === val) {
            results = this.#removeItem(c, this.#removeItem(sub, results));
            results.push({ ...sub, operator: "<=" });

            return this.sanitize(results, depth);
          }

          if ("<" === c.operator && c.value <= val) {
            return this.sanitize(this.#removeItem(c, results), depth);
          }
        }

        if ("in" === op) {
          // We join the two lists and remove the duplicates
          if ("in" === c.operator) {
            const set = new Set([
              ...this.#asArray(val),
              ...this.#asArray(c.value),
            ]);

            results = this.#removeItem(c, this.#removeItem(sub, results));
            results.push({ ...sub, value: [...set].sort() });

            return this.sanitize(results, depth);
          }
        }

        if ("not in" === op) {
          // We join the two lists and remove the duplicates
          if ("not in" === c.operator) {
            const set = new Set([
              ...this.#asArray(val),
              ...this.#asArray(c.value),
            ]);

            results = this.#removeItem(c, this.#removeItem(sub, results));
            results.push({ ...sub, value: [...set].sort() });

            return this.sanitize(results, depth);
          }
        }
      }

      // If the list has 1 item, we convert to ==
      if (["in"].includes(op)) {
        if (1 === this.#asArray(sub.value).length) {
          results = this.#removeItem(sub, results);
          results.push({ field: sub.field, operator: "==", value: val });

          return this.sanitize(results, depth);
        }
      }

      // If the list has 1 item, we convert to !=
      if (["not in"].includes(op)) {
        if (1 === this.#asArray(sub.value).length) {
          results = this.#removeItem(sub, results);
          results.push({ field: sub.field, operator: "!=", value: val });

          return this.sanitize(results, depth);
        }
      }
    }

    const gap = "  ".repeat(depth);
    const msg = ` ${gap}${Logger.color(`* Sanitized`, "b")}`;
    const values = results.map(
      (c: Constraint) => `${c.operator}${Logger.color(c.value, "m")}`
    );

    Logger.debug(`${msg} [${values.join(", ")}]`);
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
   * Remove the provided item needle from the haystack list
   * @param needle The item to find and remove.
   * @param haystack The list to search in and remove from.
   */
  #removeItem<R = any>(needle: any, haystack: R[]): R[] {
    return haystack.filter(
      (r: any) => JSON.stringify(r) !== JSON.stringify(needle)
    );
  }

  /**
   * Checks if a condition has a constraint with the provided field.
   * @param field The field to check for.
   * @param haystack The condition to search in.
   */
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
   * Test Routine:
   * We check each test item against the entire list of results.
   * The test should be an AND format, this means that the test item AND each list item must be possible
   *
   * If the current type is “any” -> we just append the items
   * If the current type is “all” -> we need to test the items against each other and all need to pass for them to be added.
   *
   * When merging up:
   * If the parent type is “any”
   *  current type “any” -> we can just append the items
   *  current type “all” -> we can just append the items
   * If the parent type is “all”
   *  current type “any” -> We need to test each item against the parent set, if any passes we add it in. The ones that fail do not get added. If none pass we stop
   *  current type “all” -> We need to test each item against the parent set, all must pass and all get added or none get added. If all do not pass we stop
   *
   * When to stop:
   * If parent is null
   *  “all” None pass STOP
   *  “any” None pass do not stop
   *
   * If parent is any
   *  “all” None pass do not stop
   *  “any” None pass do not stop
   *
   * If parent is all
   *  “all” None pass STOP
   *  “any” None pass STOP
   *
   * Algorithm:
   *  -> Prepare all constraints as array
   *  -> Prepare all conditions as array
   *    -> Sort the array to push ‘all’ conditions to the start
   *  -> Check constraints first
   *    ->  If parent is NULL
   *      -> if type is any
   *        -> add const fields/values to subject results (append)
   *       -> if type is all
   *        -> group const by field (and foreach group)
   *        -> test each const does not breach local group results or subject value
   *          -> if it passes
   *            -> add to local group results
   *          -> if fails
   *            -> empty the local/global results for all subjects
   *            -> stop processing any conditions under this node.
   *          -> if all pass send local to global
   *
   *      -> If parent is any
   *        -> if type is any
   *          we continue adding const fields/values to subject results (append)
   *        -> if type is all
   *          -> group const by field (and foreach group)
   *          -> test each const does not breach local group results or subject value
   *            -> if it passes
   *              -> add to local group results
   *            -> if fails
   *              -> empty the local results for all subjects
   *              -> stop processing any conditions under this node.
   *              -> do not empty global results.
   *            -> if some pass (all will pass)
   *              -> add local to global results
   *
   *      -> If parent is all
   *        -> if type is any
   *          -> group const by field (and foreach group)
   *            -> bal group results or subject value
   *              -> if passes
   *                -> add to global group results
   *              -> if fails
   *                -> do not add
   *              -> if all fail
   *                -> empty the local/global results for all subjects
   *                -> stop processing any conditions under this node.
   *        -> if type is all
   *          -> group const by field (and foreach group)
   *          -> test each const does not breach local group results or subject value
   *            -> if it passes
   *              -> add to local group results
   *              -> test against global results
   *                -> if it passes
   *                  -> add to global group results
   *                -> if fails
   *                  -> empty the global results for all subjects
   *                  -> stop processing any conditions under this node.
   *            -> if fails
   *              -> empty the global results for all subjects
   *              -> stop processing any conditions under this node.
   *
   *  -> Check conditions array
   *    -> recurse each condition
   */
}
