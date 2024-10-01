import { ValidationResult } from "../services";

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

export class RuleTypeError extends Error {
  constructor(message: string) {
    super(message ?? "The type of rule is not valid for this operation");
  }

  /** The name/type of the error. */
  type: string = RuleError.name;
}
