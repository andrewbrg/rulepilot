import { Rule } from "../../src";

// Go through each root condition
// if any of the nodes is a sub-rule
// ->

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
              rule: {
                conditions: [
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
                  },
                ],
                result: 15,
              },
            },
          ],
        },
        {
          rule: {
            conditions: [
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
                    rule: {
                      conditions: [
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
                        },
                      ],
                      result: 13,
                    },
                  },
                ],
              },
            ],
            result: 12,
          },
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
