import { Constraint } from "./rule";

export interface IntrospectionResult {
  [key: string]: Omit<Constraint, "field">[];
}
