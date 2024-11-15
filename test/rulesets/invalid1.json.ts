import { Rule, Condition } from "../../src";

export const invalid1Json: Rule = {
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
            {
              foo: "bar",
            } as Condition,
          ],
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
