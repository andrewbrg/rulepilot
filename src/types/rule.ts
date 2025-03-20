export type WithRequired<Type, Key extends keyof Type> = Type &
  Required<Pick<Type, Key>>;

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
    | (string | number | boolean | Record<string, unknown>)[]
    | null;
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
