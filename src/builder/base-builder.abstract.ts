import {
  Rule,
  SubRule,
  Operator,
  Condition,
  Constraint,
  ConditionType,
} from "../types/rule";

export abstract class BaseBuilder {
  /** Stores the rule being constructed */
  #rule: Rule = { conditions: [] };

  /**
   * Adds a node (in the root) to the rule being constructed
   * @param node The node to add to the rule
   */
  add(node: Condition): BaseBuilder {
    (this.#rule.conditions as Condition[]).push(node);
    return this;
  }

  /**
   * Creates a new condition node
   * @param type The type of condition
   * @param nodes Any child nodes of the condition
   * @param result The result of the condition node (for granular rules)
   * @param subRule A sub-rule to apply to the condition
   */
  condition(
    type: ConditionType,
    nodes: Condition[ConditionType],
    result?: Condition["result"],
    subRule?: SubRule
  ): Condition {
    return {
      [type]: nodes,
      ...(subRule ? { rule: subRule } : {}),
      ...(result ? { result } : {}),
    };
  }

  /**
   * Creates a new constraint node
   * @param field The field to apply the constraint to
   * @param operator The operator to apply to the field
   * @param value The value to compare the field to
   */
  constraint(
    field: string,
    operator: Operator,
    value: Constraint["value"]
  ): Constraint {
    return {
      field,
      operator,
      value,
    };
  }
}