import { Rule } from "../../src";

export const subRulesValid2Json: Rule = {
  conditions: [
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
              field: "Category",
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
