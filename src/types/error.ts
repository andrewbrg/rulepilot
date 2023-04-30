import { ValidationResult } from "../services/validator";

export class RuleError extends Error {
  constructor(validationResult: ValidationResult) {
    super(validationResult.error.message);
    this.element = validationResult.error.element;
  }

  /** The name/type of the error. */
  type: string = RuleError.name;

  /** The element that caused the error. */
  element: object;
}
