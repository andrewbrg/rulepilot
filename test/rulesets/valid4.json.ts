import { Rule } from "../../src";

export const valid4Json: Rule = {
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
              field: "CountryIso",
              operator: "contains",
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
                      value: 11,
                    },
                    {
                      field: "Category",
                      operator: "==",
                      value: 12,
                    },
                    {
                      all: [
                        {
                          field: "dd",
                          operator: "==",
                          value: 121,
                        },
                        {
                          field: "ss",
                          operator: "==",
                          value: 122,
                        },
                      ],
                    },
                  ],
                },
              ],
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
