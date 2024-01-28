import { Rule } from "../../src";

export const valid6Json: Rule = {
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
                          field: "Category",
                          operator: "==",
                          value: 122,
                        },
                        {
                          field: "IsUnder18",
                          operator: "==",
                          value: true,
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
