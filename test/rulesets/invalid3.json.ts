// an invalid rule with null and greater than
import { Rule } from "../../src";

export const invalid3Json: Rule = {
  conditions: [
    {
      any: [
        {
          field: "foo",
          operator: ">=",
          value: null,
        },
      ],
      result: 3,
    },
    {
      all: [
        {
          field: "Category",
          operator: "==",
          value: "Islamic",
        },
      ],
      result: 4,
    },
  ],
  default: 2,
};
