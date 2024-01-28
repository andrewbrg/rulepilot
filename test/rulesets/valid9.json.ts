import { Rule } from "../../src";

export const valid9Json: Rule = {
  conditions: [
    {
      any: [
        {
          all: [
            {
              field: "country",
              operator: "in",
              value: ["GB", "FI"],
            },
            {
              field: "hasCoupon",
              operator: "==",
              value: true,
            },
            {
              field: "totalCheckoutPrice",
              operator: ">=",
              value: 120.0,
            },
          ],
        },
        {
          field: "country",
          operator: "==",
          value: "SE",
        },
      ],
      result: 5,
    },
    {
      all: [
        {
          field: "age",
          operator: ">=",
          value: 18,
        },
        {
          field: "hasStudentCard",
          operator: "==",
          value: true,
        },
      ],
      result: 10,
    },
  ],
};
