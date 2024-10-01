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
  | "not contains"
  | "contains any"
  | "not contains any"
  | "matches"
  | "not matches";

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
  rule?: SubRule<R>;
  result?: R;
}

export interface Rule<R = any> {
  conditions: Condition<R> | Condition<R>[];
  default?: R;
}

export interface SubRule<R = any> {
  conditions: Condition<R> | Condition<R>[];
  result?: R;
}

export interface CriteriaRange<R = any> {
  result: R;
  options?: Record<string, unknown>[];
}

export interface IntrospectionResult<R = any> {
  results: CriteriaRange<R>[];
  default?: R;
}
