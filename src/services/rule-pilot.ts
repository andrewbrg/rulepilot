import { Builder } from "./builder";
import { Evaluator } from "./evaluator";
import { ValidationResult, Validator } from "./validator";

import { Rule } from "../types/rule";
import { RuleError } from "../types/error";

export class RulePilot {
  private static _validator: Validator = new Validator();
  private static _evaluator: Evaluator = new Evaluator();

  /**
   * Returns a rule builder class instance.
   * Allows for the construction of rules using a fluent interface.
   */
  static builder(): Builder {
    return new Builder(RulePilot._validator);
  }
  /**
   * Evaluates a rule against a set of criteria and returns the result.
   *
   * @param rule The rule to evaluate.
   * @param criteria The criteria to evaluate the rule against.
   * @param trustRule Set true to avoid validating the rule before evaluating it (faster).
   * @throws Error if the rule is invalid.
   */
  static evaluate(rule: Rule, criteria: object, trustRule = false): any {
    // Before we evaluate the rule, we should validate it.
    // However, if `trustRuleset` is set to true, we will skip validation.
    const validationResult = !trustRule && RulePilot.validate(rule);
    if (!trustRule && !validationResult.isValid) {
      throw new RuleError(validationResult);
    }

    return RulePilot._evaluator.evaluate(rule, criteria);
  }

  /**
   * Takes in a rule as a parameter and returns a ValidationResult
   * indicating whether the rule is valid or not.
   *
   * Invalid rules will contain an error property which contains a message and the element
   * that caused the validation to fail.
   *
   * @param rule The rule to validate.
   */
  static validate(rule: Rule): ValidationResult {
    return RulePilot._validator.validate(rule);
  }
}
