export type ConditionType = "any" | "all" | "none";
export type Operator = "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not in";

export interface Constraint {
  field: string;
  operator: Operator;
  value:
    | string
    | number
    | boolean
    | object
    | (string | number | boolean | object)[];
}

export interface Condition {
  any?: (Constraint | Condition)[];
  all?: (Constraint | Condition)[];
  none?: (Constraint | Condition)[];
  result?:
    | string
    | number
    | boolean
    | object
    | (string | number | boolean | object)[];
}

export interface Rule {
  conditions: Condition | Condition[];
  default?:
    | string
    | number
    | boolean
    | object
    | (string | number | boolean | object)[];
}
