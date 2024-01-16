export type ConditionType = "any" | "all" | "none";
export type Operator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "in"
  | "not in"
  | "contains"
  | "contains any";

export interface Constraint {
  field: string;
  operator: Operator;
  value:
    | string
    | number
    | boolean
    | Record<string, unknown>
    | (string | number | boolean | Record<string, unknown>)[];
}

export interface Condition<R = any> {
  any?: (Constraint | Condition<R>)[];
  all?: (Constraint | Condition<R>)[];
  none?: (Constraint | Condition<R>)[];
  result?: R;
}

export interface Rule<R = any> {
  conditions: Condition<R> | Condition<R>[];
  default?: R;
}

export interface CriteriaRange<R = any> {
  type: R;
  options?: Record<string, unknown>[];
  isDefault: boolean;
}
