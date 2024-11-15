import { Rule } from "../../src";

export const subRulesValid3Json: Rule = {
  conditions: [
    {
      all: [
        {
          any: [
            {
              field: "fieldA",
              operator: "==",
              value: "bar",
            },
            {
              field: "fieldB",
              operator: ">=",
              value: 2,
            },
            {
              all: [
                {
                  field: "fieldD",
                  operator: "==",
                  value: "whoop",
                },
              ],
              result: 33,
            },
          ],
        },
        {
          field: "fieldC",
          operator: "not in",
          value: [1, 2, 3],
        },
      ],
      result: 3,
    },
    {
      none: [{ field: "fieldE", operator: "==", value: "hoop" }],
      result: 5,
    },
    {
      any: [
        {
          field: "fieldA",
          operator: "==",
          value: "value",
        },
      ],
    },
  ],
  default: 2,
};
