import { Rule } from "../../src";

// Test against Category 900
// -> Leverage 1000, 500
// -> Monetization Demo

export const subRulesValid2Json: Rule = {
  conditions: [
    {
      none: [
        {
          field: "Category",
          operator: "==",
          value: 900,
        },
        {
          field: "Leverage",
          operator: "==",
          value: 500,
        },
        {
          any: [
            {
              field: "Leverage",
              operator: "==",
              value: 1000,
            },
            {
              field: "Leverage",
              operator: "==",
              value: 500,
            },
          ],
          result: 100,
        },
      ],
      result: 50,
    },
    {
      any: [
        {
          field: "Leverage",
          operator: "==",
          value: 1000,
        },
        {
          field: "Leverage",
          operator: "==",
          value: 500,
        },
        {
          all: [
            {
              field: "Leverage",
              operator: "==",
              value: "Demo",
            },
            {
              any: [
                {
                  field: "Category",
                  operator: ">=",
                  value: 1000,
                },
                {
                  field: "Category",
                  operator: "==",
                  value: 22,
                },
                {
                  any: [
                    {
                      field: "Category",
                      operator: "==",
                      value: 900,
                    },
                    {
                      field: "Category",
                      operator: "==",
                      value: 910,
                    },
                  ],
                },
              ],
              result: 15,
            },
          ],
        },
        {
          all: [
            {
              field: "CountryIso",
              operator: "in",
              value: ["GB", "FI"],
            },
            {
              field: "Leverage",
              operator: ">",
              value: 500,
            },
            {
              field: "Monetization",
              operator: "==",
              value: "Real",
            },
            {
              any: [
                {
                  field: "Category",
                  operator: ">=",
                  value: 1000,
                },
                {
                  field: "Category",
                  operator: "==",
                  value: 22,
                },
                {
                  any: [
                    {
                      field: "Category",
                      operator: "==",
                      value: 900,
                    },
                    {
                      field: "Category",
                      operator: "==",
                      value: 910,
                    },
                  ],
                },
              ],
              result: 13,
            },
          ],
          result: 12,
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
