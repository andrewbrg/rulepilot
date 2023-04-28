import { ObjectDiscovery } from "./object-discovery";
import { Condition, Constraint, Operator, Rule } from "../types/rule";

export interface ValidationResult {
  isValid: boolean;
  error?: {
    message: string;
    element: object;
  };
}

export class Validator {
  private objectDiscovery: ObjectDiscovery = new ObjectDiscovery();

  /**
   * Takes in a rule as a parameter and returns a boolean indicating whether the rule is valid or not.
   * @param rule The rule to validate.
   */
  validate(rule: Rule): ValidationResult {
    // Assume the rule is valid.
    let result: ValidationResult = { isValid: true };

    // Cater for the case where the conditions property is not an array.
    const conditions =
      rule.conditions instanceof Array ? rule.conditions : [rule.conditions];

    // Validate the 'conditions' property.
    if (conditions.length === 0) {
      return {
        isValid: false,
        error: {
          message:
            "The conditions property must contain at least one condition.",
          element: rule,
        },
      };
    }

    // Validate each condition in the rule.
    for (const condition of conditions) {
      const subResult = this.validateCondition(condition);
      result.isValid = result.isValid && subResult.isValid;
      result.error = result?.error ?? subResult?.error;
    }

    return result;
  }

  /** ml/l.k,
   * Evaluates a condition to ensure it is syntactically correct.
   * @param condition The condition to validate.
   * @param depth The current recursion depth
   */
  private validateCondition(
    condition: Condition,
    depth: number = 0
  ): ValidationResult {
    // Check to see if the condition is valid.
    let result = this.isValidCondition(condition);

    // Set the type of condition.
    const type = this.objectDiscovery.conditionType(condition);

    // Validate each item in the condition.
    for (const item of condition[type]) {
      if (this.objectDiscovery.isCondition(item)) {
        const subResult = this.validateCondition(item as Condition, depth + 1);
        result.isValid = result.isValid && subResult.isValid;
        result.error = result?.error ?? subResult?.error;
      }

      if (this.objectDiscovery.isConstraint(item)) {
        const subResult = this.validateConstraint(item as Constraint);
        result.isValid = result.isValid && subResult.isValid;
        result.error = result?.error ?? subResult?.error;
      }

      // Result is only valid on the root condition.
      if (depth > 0 && "result" in condition) {
        return {
          isValid: false,
          error: {
            message: "Nested conditions cannot have a result property.",
            element: item,
          },
        };
      }

      // If any part fails validation there is no point to continue.
      if (!result.isValid) {
        break;
      }
    }

    return result;
  }

  /**
   * Checks a constraint to ensure it is syntactically correct.
   * @param constraint The constraint to validate.
   */
  private validateConstraint(constraint: Constraint): ValidationResult {
    if (!this.objectDiscovery.isConstraint(constraint)) {
      return {
        isValid: false,
        error: {
          message: "Invalid constraint structure.",
          element: constraint,
        },
      };
    }

    if ("string" !== typeof constraint.field) {
      return {
        isValid: false,
        error: {
          message: 'Constraint "field" must be of type string.',
          element: constraint,
        },
      };
    }

    if (!Object.values(Operator).includes(constraint.operator as Operator)) {
      return {
        isValid: false,
        error: {
          message: 'Constraint "operator" has invalid type.',
          element: constraint,
        },
      };
    }

    // We must check that the value is an array if the operator is 'in' or 'not in'.
    if (
      [Operator.In, Operator.NotIn].includes(constraint.operator as Operator) &&
      !(constraint.value instanceof Array)
    ) {
      return {
        isValid: false,
        error: {
          message:
            'The "value" must be an array if the "operator" is "in" or "not in"',
          element: constraint,
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Checks an object to see if it is a valid condition.
   * @param obj The object to check.
   */
  private isValidCondition(obj: any): ValidationResult {
    if (!this.objectDiscovery.isCondition(obj)) {
      return {
        isValid: false,
        error: {
          message: "Invalid condition structure.",
          element: obj,
        },
      };
    }

    // A valid condition must have an 'any' or 'all' property, but cannot have both.
    if ("any" in obj && "all" in obj) {
      return {
        isValid: false,
        error: {
          message:
            'A condition cannot have both an "any" and an "all" property.',
          element: obj,
        },
      };
    }

    return { isValid: true };
  }
}
