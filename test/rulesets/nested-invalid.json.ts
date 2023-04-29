import { Rule } from "../../src";

export const nestedInValidJson: Rule = {
  conditions: [
    {
      any: [
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
          // Result property is only allowed on the top level conditions
          result: "This is invalid!!!!!!!",
        },
        {
          all: [
            {
              field: "Leverage",
              operator: ">=",
              value: 1000,
            },
          ],
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
