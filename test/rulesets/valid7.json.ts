import { Rule } from "../../src";

export const valid7Json: Rule = {
  conditions: [
    {
      none: [
        {
          all: [
            {
              field: "CountryIso",
              operator: "in",
              value: ["GB", "FI"],
            },
            {
              field: "Leverage",
              operator: "<",
              value: 200,
            },
            {
              field: "Monetization",
              operator: "==",
              value: "Real",
            },
          ],
        },
        {
          field: "Leverage",
          operator: ">=",
          value: 1000,
        },
      ],
      result: 3,
    },
    {
      none: [
        {
          field: "Category",
          operator: "==",
          value: "Islamic",
        },
      ],
      result: 4,
    },
  ],
};
