import {
  Rule,
  Operator,
  Condition,
  Constraint,
  ConditionType,
} from "../types/rule";
import { Validator } from "../services";
import { RuleError } from "../types/error";
import { SubRuleBuilder } from "./sub-rule-builder";

export class Builder {
  constructor(validator: Validator) {
    this.#validator = validator;
  }

  /** Stores the rule being constructed */
  #rule: Rule = { conditions: [] };

  /** Holds a reference to the Validator class */
  #validator: Validator;

  /**
   * Adds a node (in the root) to the rule being constructed
   * @param node The node to add to the rule
   */
  add(node: Condition): Builder {
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
    subRule?: SubRuleBuilder
  ): Condition {
    return {
      [type]: nodes,
      ...(subRule ? { rule: subRule.build() } : {}),
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

  /**
   * Sets the default value of the rule being constructed
   * @param value The default value of the rule
   */
  default(value: Rule["default"]): Builder {
    this.#rule.default = value;
    return this;
  }

  /**
   * Builds the rule being and returns it
   * @param validate Whether to validate the rule before returning it
   * @throws Error if validation is enabled and the rule is invalid
   */
  build(validate?: boolean): Rule {
    if (!validate) return this.#rule;

    const validationResult = this.#validator.validate(this.#rule);
    if (validationResult.isValid) return this.#rule;

    throw new RuleError(validationResult);
  }

  /**
   * Creates a new sub-rule builder
   */
  subRule(): SubRuleBuilder {
    return new SubRuleBuilder();
  }
}
