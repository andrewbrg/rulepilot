import { Builder } from "./builder";
import { Mutator } from "./mutator";
import { Evaluator } from "./evaluator";
import { Introspector } from "./introspector";
import { ValidationResult, Validator } from "./validator";

import { CriteriaRange, Rule } from "../types/rule";
import { RuleError } from "../types/error";

export class RulePilot {
  private static _rulePilot = new RulePilot();

  private _mutator: Mutator = new Mutator();
  private _validator: Validator = new Validator();
  private _evaluator: Evaluator = new Evaluator();
  private _introspector: Introspector = new Introspector();

  /**
   * Returns a rule builder class instance.
   * Allows for the construction of rules using a fluent interface.
   */
  builder(): Builder {
    return new Builder(this._validator);
  }

  /**
   * Adds a mutation to the rule pilot instance.
   * Mutations allow for the modification of the criteria before
   * it is evaluated against a rule.
   *
   * @param name The name of the mutation.
   * @param mutation The mutation function.
   */
  addMutation(name: string, mutation: Function): RulePilot {
    this._mutator.add(name, mutation);
    return this;
  }

  /**
   * Removes a mutation to the rule pilot instance.
   * Any cached mutation values for this mutation will be purged.
   *
   * @param name The name of the mutation.
   */
  removeMutation(name: string): RulePilot {
    this._mutator.remove(name);
    return this;
  }

  /**
   * Clears the mutator cache.
   * The entire cache, or cache for a specific mutator, can be cleared
   * by passing or omitting the mutator name as an argument.
   *
   * @param name The mutator name to clear the cache for.
   */
  clearMutationCache(name?: string): RulePilot {
    this._mutator.clearCache(name);
    return this;
  }

  /**
   * Evaluates a rule against a set of criteria and returns the result.
   * If the criteria is an array (indicating multiple criteria to test),
   * the rule will be evaluated against each item in the array and
   * an array of results will be returned.
   *
   * @param rule The rule to evaluate.
   * @param criteria The criteria to evaluate the rule against.
   * @param trustRule Set true to avoid validating the rule before evaluating it (faster).
   * @throws RuleError if the rule is invalid.
   */
  async evaluate<T>(
    rule: Rule,
    criteria: object | object[],
    trustRule = false
  ): Promise<T> {
    // Before we evaluate the rule, we should validate it.
    // If `trustRuleset` is set to true, we will skip validation.
    const validationResult = !trustRule && this.validate(rule);
    if (!trustRule && !validationResult.isValid) {
      throw new RuleError(validationResult);
    }

    return this._evaluator.evaluate(rule, await this._mutator.mutate(criteria));
  }

  /**
   * Given a rule, checks the constraints and conditions to determine
   * the possible range of input criteria which would be satisfied by the rule.
   *
   * @param rule The rule to evaluate.
   * @throws RuleError if the rule is invalid
   * @throws RuleTypeError if the rule is not granular
   */
  determineCriteriaRange<T>(rule: Rule): CriteriaRange<T>[] {
    // Before we proceed with the rule, we should validate it.
    const validationResult = this.validate(rule);
    if (!validationResult.isValid) {
      throw new RuleError(validationResult);
    }

    return this._introspector.determineCriteriaRange<T>(rule);
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
  validate(rule: Rule): ValidationResult {
    return this._validator.validate(rule);
  }

  /**
   * Returns a rule builder class instance.
   * Allows for the construction of rules using a fluent interface.
   */
  static builder(): Builder {
    return this._rulePilot.builder();
  }

  /**
   * Evaluates a rule against a set of criteria and returns the result.
   * If the criteria is an array (indicating multiple criteria to test),
   * the rule will be evaluated against each item in the array and
   * an array of results will be returned.
   *
   * @param rule The rule to evaluate.
   * @param criteria The criteria to evaluate the rule against.
   * @param trustRule Set true to avoid validating the rule before evaluating it (faster).
   * @throws RuleError if the rule is invalid.
   */
  static async evaluate<T>(
    rule: Rule,
    criteria: object | object[],
    trustRule = false
  ): Promise<T> {
    return RulePilot._rulePilot.evaluate<T>(rule, criteria, trustRule);
  }

  /**
   * Given a rule, checks the constraints and conditions to determine
   * the possible range of input criteria which would be satisfied by the rule.
   *
   * @param rule The rule to introspect.
   * @throws RuleError if the rule is invalid
   * @throws RuleTypeError if the rule is not granular
   */
  static determineCriteriaRange<T>(rule: Rule): CriteriaRange<T>[] {
    return RulePilot._rulePilot.determineCriteriaRange<T>(rule);
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
    return RulePilot._rulePilot.validate(rule);
  }

  /**
   * Adds a mutation.
   *
   * Mutations allow for the modification of the criteria before
   * it is evaluated against a rule.
   *
   * @param name The name of the mutation.
   * @param mutation The mutation function.
   */
  static addMutation(name: string, mutation: Function): RulePilot {
    return RulePilot._rulePilot.addMutation(name, mutation);
  }

  /**
   * Removes a mutation to the rule pilot instance.
   * Any cached mutation values for this mutation will be purged.
   *
   * @param name The name of the mutation.
   */
  static removeMutation(name: string): RulePilot {
    return RulePilot._rulePilot.removeMutation(name);
  }

  /**
   * Clears the mutator cache.
   * The entire cache, or cache for a specific mutator, can be cleared
   * by passing or omitting the mutator name as an argument.
   *
   * @param name The mutator name to clear the cache for.
   */
  static clearMutationCache(name?: string): RulePilot {
    return RulePilot._rulePilot.clearMutationCache(name);
  }
}
