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
    if (
      conditions.length === 0 ||
      (this.objectDiscovery.isObject(conditions[0]) &&
        !Object.keys(conditions[0]).length)
    ) {
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
    if (!result.isValid) {
      return result;
    }

    // Set the type of condition.
    const type = this.objectDiscovery.conditionType(condition);

    // Validate each item in the condition.
    for (const node of condition[type]) {
      const isCondition = this.objectDiscovery.isCondition(node);
      if (isCondition) {
        const subResult = this.validateCondition(node as Condition, depth + 1);
        result.isValid = result.isValid && subResult.isValid;
        result.error = result?.error ?? subResult?.error;
      }

      const isConstraint = this.objectDiscovery.isConstraint(node);
      if (isConstraint) {
        const subResult = this.validateConstraint(node as Constraint);
        result.isValid = result.isValid && subResult.isValid;
        result.error = result?.error ?? subResult?.error;
      }

      if (!isConstraint && !isCondition) {
        return {
          isValid: false,
          error: {
            message: "Each node should be a condition or constraint.",
            element: node,
          },
        };
      }

      // Result is only valid on the root condition.
      if (depth > 0 && "result" in condition) {
        return {
          isValid: false,
          error: {
            message: 'Nested conditions cannot have a property "result".',
            element: node,
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
    if ("string" !== typeof constraint.field) {
      return {
        isValid: false,
        error: {
          message: 'Constraint "field" must be of type string.',
          element: constraint,
        },
      };
    }

    const operators = ["==", "!=", ">", "<", ">=", "<=", "in", "not in"];
    if (!operators.includes(constraint.operator as Operator)) {
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
      ["in", "not in"].includes(constraint.operator) &&
      !Array.isArray(constraint.value)
    ) {
      return {
        isValid: false,
        error: {
          message:
            'Constraint "value" must be an array if the "operator" is "in" or "not in"',
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

    const isAny = "any" in obj;
    const isAll = "all" in obj;
    const isNone = "none" in obj;

    // A valid condition must have an 'any', 'all', or 'none' property,
    // but cannot have more than one.
    if ((isAny && isAll) || (isAny && isNone) || (isAll && isNone)) {
      return {
        isValid: false,
        error: {
          message:
            'A condition cannot have more than one "any", "all", or "none" property.',
          element: obj,
        },
      };
    }

    return { isValid: true };
  }
}
