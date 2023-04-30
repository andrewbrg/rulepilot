import { Condition, Rule } from "../../src";

export const valid4Json: Rule = {
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
      all: [
        {
          field: "Category",
          operator: "==",
          value: "Islamic",
        },
      ],
      result: 4,
    },
    {
      foo: "bar",
    } as Condition,
  ],
  default: 2,
};
