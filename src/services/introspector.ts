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

    // todo remove
    console.log("subRules", JSON.stringify(subRules));
    console.log("conditions", JSON.stringify(conditions));

    // At this point the search becomes as follows: What are the possible values for the
    // subjects which will satisfy the rule if the rule is tested against the constraint provided.

    const results = {};

    // We introspect the conditions to determine the possible values for the subjects
    for (const condition of conditions) {
      const { values } = this.#introspectConditions(condition, constraint);
      if (!values) continue;

      const key = condition.result ?? "default";
      results[key] = results[key] ?? {};

      // Merge the results maintaining the uniqueness of the values
      for (const [field, constraints] of values.entries()) {
        if (!subjects.includes(field)) continue;

        const set = new Set([...(results[field] ?? [])]);
        for (const constraint of constraints) {
          set.add({ value: constraint.value, operator: constraint.operator });
        }

        results[key][field] = Array.from(set);
      }
    }

    console.log("Results", JSON.stringify(results));

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
   * todo test this and validate
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
        ? `\nIntrospecting "${this.#txtBold(type)}" condition`
        : `${gap}--> "${this.#txtBold(type)}" condition`;
    Logger.debug(msg);

    // Iterate over all grouped constraints
    for (const [field, constraints] of groupedConst.entries()) {
      // Prepare the local results
      const candidates: Constraint[] = [];

      if (!parentType) {
        if ("any" === type)
          for (const c of constraints) {
            this.#appendResult(parentResults, c);

            const gap = "  ".repeat(depth);
            const col = this.#txtCol(c.field, "g");
            const val = this.#txtCol(c.value, "y");
            const msg = ` ${gap}+ Adding '${col}'${c.operator}'${val}'`;
            Logger.debug(msg, `(${this.#txtCol("pass", "g")})`);
          }

        if ("all" === type) {
          for (const c of constraints) {
            // Test against the local results, if it fails, empty the results and return
            if (!this.#test(candidates, input, c, depth)) {
              Logger.debug(`${gap}X Exiting & discarding results...`);

              // Stop processing condition & empty the results
              return { stop: true, void: true };
            }

            // Append to local results
            candidates.push(c);
          }
        }
      }

      if ("any" == parentType) {
        if ("any" === type) {
          for (const c of constraints) {
            this.#appendResult(parentResults, c);

            const gap = "  ".repeat(depth);
            const col = this.#txtCol(c.field, "g");
            const val = this.#txtCol(c.value, "y");
            const msg = ` ${gap}+ Adding '${col}'${c.operator}'${val}'`;
            Logger.debug(msg, `(${this.#txtCol("pass", "g")})`);
          }
        }

        if ("all" === type) {
          for (const c of constraints) {
            if (!this.#test(candidates, input, c, depth)) {
              // Stop processing condition & DO NOT empty the parent results
              return { stop: true, void: false };
            }

            candidates.push(c);
          }
        }
      }

      if ("all" == parentType) {
        if ("any" === type) {
          // Track if all failed
          let allFailed = true;
          for (const c of constraints) {
            // Test against the parent results, if it passes, append to parent results
            const res = parentResults.get(field) ?? [];
            if (this.#test([...candidates, ...res], input, c, depth)) {
              allFailed = false;
              candidates.push(c);
            }
          }

          // Stop processing condition & empty the results
          if (allFailed) return { stop: true, void: true };
        }

        if ("all" === type) {
          for (const c of constraints) {
            // Get parent results for the field
            const results = parentResults.get(field) ?? [];

            // Test against local and parent results, if any fail, empty parent results and return
            if (!this.#test(candidates, input, c, depth)) {
              Logger.debug(`${gap}X Exiting & discarding results...`);

              // Stop processing condition & empty the results
              return { stop: true, void: true };
            }

            if (!this.#test(results, input, c, depth)) {
              Logger.debug(`${gap}X Exiting & discarding results...`);

              // Stop processing condition & empty the results
              return { stop: true, void: true };
            }

            // Append to local results
            candidates.push(c);
          }
        }
      }

      // Add the local results to the parent results
      this.#sanitizeCandidates(candidates, depth).forEach((c) =>
        this.#appendResult(parentResults, c)
      );
    }

    // Log the results
    for (const [k, v] of parentResults.entries()) {
      const values = [];
      for (const c of v) {
        values.push(`${c.operator}${this.#txtCol(c.value, "y")}`);
      }

      const msg = ` ${gap}${this.#txtCol("* Results", "m")} `;
      Logger.debug(`${msg}${this.#txtCol(k, "g")}: ${values.join(", ")}`);
    }

    // Iterate over all conditions
    for (const c of conditions) {
      // Introspect the condition and append the results to the parent results
      const d = depth + 1;
      const res = this.#introspectConditions(c, input, type, parentResults, d);

      if (res.void) parentResults = new Map();
      if (res.stop)
        return { values: parentResults, stop: res.stop, void: res.void };

      if (res?.values) {
        for (const constraints of res.values.values()) {
          constraints.forEach((c) => this.#appendResult(parentResults, c));
        }
      }
    }

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
   * todo test this and validate
   * @param candidates The result candidates to test against.
   * @param input The constraint which was input to the introspection.
   * @param item The constraint item to test against the candidates.
   * @param depth The current recursion depth.
   */
  #test(
    candidates: Constraint[],
    input: Omit<Constraint, "operator">,
    item: Constraint,
    depth: number
  ): boolean {
    // Filter out results which do not match the field of the constraint
    candidates = candidates.filter((r) => r.field === item.field);

    // Check if the input constraint matches the field of the item
    const inputMatches = input.field === item.field;

    // Add the input constraint to the results (if it also matches the field)
    if (inputMatches) candidates.push({ ...input, operator: "==" });

    if (!candidates.length) return true;

    // Test that the constraint does not breach the results
    let result = false;
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

          // Must be equal to the value irrelevant of the operator
          ops = ["==", ">=", "<="];
          if (ops.includes(operator) && value === c.value) result = true;

          // Item value must allow for constraint value to exist in item value range
          if ("<" === operator && value > c.value) result = true;
          if (">" === operator && value < c.value) result = true;

          // Item value cannot be equal to constraint value
          if ("!=" === operator && value !== c.value) result = true;

          // One of the values in the item must match the candidate value
          if ("in" === operator) {
            if (this.#asArray(value).some((val) => val === c.value))
              result = true;
          }

          // None of the values in the item must match the candidate value
          if ("not in" === operator) {
            if (!this.#asArray(value).some((val) => val === c.value))
              result = true;
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
          if ("==" === operator && value !== c.value) result = true;

          // Always pass
          ops = ["!=", ">", ">=", "<", "<=", "not in"];
          if (ops.includes(operator)) result = true;

          // One of the values in the item must NOT match the candidate value
          if ("in" === operator) {
            if (this.#asArray(value).some((val) => val !== c.value))
              result = true;
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

          // Must be bigger than the value
          ops = ["==", "<="];
          if (ops.includes(operator) && value > c.value) result = true;

          if ("<" === operator && Number(value) > Number(c.value) + 2)
            result = true;

          // Always pass
          ops = ["!=", ">", ">=", "not in"];
          if (ops.includes(operator)) result = true;

          // One of the values in the item must match the candidate value
          if ("in" === operator) {
            if (this.#asArray(value).some((val) => val > c.value))
              result = true;
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

          // Must be smaller than the value
          ops = ["==", ">="];
          if (ops.includes(operator) && value < c.value) result = true;

          if (">" === operator && Number(value) < Number(c.value) - 2)
            result = true;

          // Always pass
          ops = ["!=", "<", "<=", "not in"];
          if (ops.includes(operator)) result = true;

          // One of the values in the item must match the candidate value
          if ("in" === operator) {
            if (this.#asArray(value).some((val) => val < c.value))
              result = true;
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

          // Must be bigger than the value
          ops = ["==", "<="];
          if (ops.includes(operator) && value >= c.value) result = true;

          if ("<" === operator && Number(value) >= Number(c.value) + 1)
            result = true;

          // Always pass
          ops = ["!=", ">=", ">", "not in"];
          if ("!=" === operator) result = true;

          // One of the values in the item must match the candidate value
          if ("in" === operator) {
            if (this.#asArray(value).some((val) => val >= c.value))
              result = true;
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

          // Must be smaller than the value
          ops = ["==", ">="];
          if (ops.includes(operator) && value <= c.value) result = true;

          if (">" === operator && Number(value) >= Number(c.value) - 1)
            result = true;

          // Always pass
          ops = ["!=", "<=", "<", "not in"];
          if ("!=" === operator) result = true;

          // One of the values in the item must match the candidate value
          if ("in" === operator) {
            if (this.#asArray(value).some((val) => val <= c.value))
              result = true;
          }
          break;
        case "in":
          /**
           *  c = (L [500,501)
           *  IN [500, 502]
           *  NOT IN [499, 500]
           */

          // For each item run the same checks as for the '==' operator
          for (const subVal of this.#asArray(c.value)) {
            // Must be equal to the value irrelevant of the operator
            ops = ["==", ">=", "<="];
            if (ops.includes(operator) && value === subVal) result = true;

            // Item value must allow for constraint value to exist in item value range
            if ("<" === operator && value > subVal) result = true;
            if (">" === operator && value < subVal) result = true;

            // Item value cannot be equal to constraint value
            if ("!=" === operator && value !== subVal) result = true;
          }

          // One of the values in the item must match any candidate values
          const inValues = this.#asArray(c.value);
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

          // Always pass
          if ("not in" === operator) result = true;

          // For each item run the same checks as for the '!=' operator
          for (const subVal of this.#asArray(c.value)) {
            // Must be different
            if ("==" === operator && value !== subVal) result = true;

            // Always pass
            ops = ["!=", ">", ">=", "<", "<=", "not in"];
            if (ops.includes(operator)) result = true;
          }

          // One of the values in the item must NOT match any candidate values
          const nInValues = this.#asArray(c.value);
          if ("in" === operator) {
            if (this.#asArray(value).some((val) => !nInValues.includes(val)))
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
    const col = this.#txtCol(item.field, "g");
    const val = this.#txtCol(item.value, "y");
    const pass = this.#txtCol("pass", "g");
    const fail = this.#txtCol("fail", "r");

    const msg = ` ${gap}> Testing '${col}'${item.operator}'${val}'`;
    Logger.debug(msg, `(${result ? pass : fail})`);

    // Return the result
    return result;
  }

  /**
   *
   * @param candidates The constraints to sanitize.
   * @param depth The current recursion depth.
   */
  #sanitizeCandidates(candidates: Constraint[], depth: number): Constraint[] {
    // If the list less than 2 items, we can return it as is
    if (candidates.length < 2) return candidates;

    const gap = "  ".repeat(depth);
    const msg = ` ${gap}> ${this.#txtCol(`Sanitizing`, "b")}:`;

    const values = [];
    for (const c of candidates) {
      values.push(`${c.operator}${this.#txtCol(c.value, "m")}`);
    }

    // Flag to indicate if the list has been modified
    let modified = false;

    // Search for candidates with <,>,<=,>= operators
    for (const c of candidates) {
      if (["<", ">", "<=", ">="].includes(c.operator)) {
        const index = candidates.indexOf(c);
        const val = c.value;
        const op = c.operator;

        for (let i = 0; i < candidates.length; i++) {
          if (i === index) continue;

          const item = candidates[i];
          if (item.operator === "==") {
            if (["<=", ">="].includes(op)) {
              delete candidates[i];
              modified = true;
            }

            if ("<" === op && item.value < val) {
              delete candidates[i];
              modified = true;
            }

            if (">" === op && item.value > val) {
              console.log("sdasd");
              delete candidates[i];
              modified = true;
            }
          }
        }
      }
    }

    !modified && Logger.debug(`${msg} ${values.join(", ")}`);
    return modified ? this.#sanitizeCandidates(candidates, depth) : candidates;
  }

  /**
   * Formats text with color.
   * @param text The text to colorize.
   * @param color The color to apply.
   */
  #txtCol(text: any, color: "r" | "g" | "b" | "y" | "m"): string {
    if ("r" === color) return `\x1b[31m${text}\x1b[0m`;
    if ("g" === color) return `\x1b[32m${text}\x1b[0m`;
    if ("y" === color) return `\x1b[33m${text}\x1b[0m`;
    if ("b" === color) return `\x1b[34m${text}\x1b[0m`;
    if ("m" === color) return `\x1b[35m${text}\x1b[0m`;

    return text.toString();
  }

  /**
   * Formats text as bold.
   * @param text The text to bold.
   */
  #txtBold(text: any): string {
    return `\x1b[1m${text}\x1b[0m`;
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
