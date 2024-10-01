import { Rule } from "../types/rule";
import { Validator } from "../services";
import { RuleError } from "../types/error";
import { SubRuleBuilder } from "./sub-rule-builder";
import { BaseBuilder } from "./base-builder.abstract";

export class Builder extends BaseBuilder {
  constructor(validator: Validator) {
    super();
    this.#validator = validator;
  }

  /** Stores the rule being constructed */
  #rule: Rule = { conditions: [] };

  /** Holds a reference to the Validator class */
  #validator: Validator;

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
