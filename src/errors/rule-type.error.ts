import { RuleError } from "./rule.error";

export class RuleTypeError extends Error {
  constructor(message: string) {
    super(message ?? "The type of rule is not valid for this operation");
  }

  /** The name/type of the error. */
  type: string = RuleError.name;
}
