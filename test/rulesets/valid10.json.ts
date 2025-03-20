import { Rule } from "../../src";

export const valid10Json: Rule = {
  conditions: [
    {
      all: [
        {
          field: "foo",
          operator: "==",
          value: null,
        },
        {
          field: "bar",
          operator: "!=",
          value: null,
        },
        {
          field: "foo_array",
          operator: "contains",
          value: null,
        },
        {
          field: "bar_array",
          operator: "not contains",
          value: null,
        },
      ],
    }
  ],
};
