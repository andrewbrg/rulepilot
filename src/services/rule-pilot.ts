import { Rule } from "../types/rule";
import { Evaluator } from "./evaluator";
import { ValidationResult, Validator } from "./validator";

export class RulePilot {
  private static validator: Validator = new Validator();
  private static evaluator: Evaluator = new Evaluator();

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
      throw new Error(JSON.stringify(validationResult.error));
    }

    return RulePilot.evaluator.evaluate(rule, criteria);
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
    return RulePilot.validator.validate(rule);
  }
}
