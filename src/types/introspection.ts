export interface CriteriaRange<R = any> {
  result: R;
  options?: Record<string, unknown>[];
}

export interface IntrospectionResult<R = any> {
  results: CriteriaRange<R>[];
  default?: R;
}
