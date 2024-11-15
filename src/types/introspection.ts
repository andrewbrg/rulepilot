import { Constraint } from "./rule";

type IntrospectionResultSubject = {
  subject: string;
  values: Omit<Constraint, "field">[];
};

export type IntrospectionResult<R> = {
  result: R;
  subjects: IntrospectionResultSubject[];
};
