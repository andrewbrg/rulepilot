export enum Operator {
  Equal = "==",
  NotEqual = "!=",
  GreaterThan = ">",
  GreaterThanOrEqual = ">=",
  LessThan = "<",
  LessThanOrEqual = "<=",
  In = "in",
  NotIn = "not in",
}

export interface Constraint {
  field: string;
  operator: Operator | string;
  value?: string | number | boolean | string[] | number[] | boolean[];
}

export type ConditionType = "any" | "all" | "none";

export interface Condition {
  any?: Constraint[] | Condition[];
  all?: Constraint[] | Condition[];
  result?: string | number | boolean;
}

export interface Rule {
  conditions: Condition | Condition[];
  default?: string | number | boolean;
}
