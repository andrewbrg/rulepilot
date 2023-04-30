import { Rule } from "../../src";

export const valid2Json: Rule = {
  conditions: {
    any: [
      {
        all: [
          {
            field: "Leverage",
            operator: "<=",
            value: 100,
          },
          {
            field: "WinRate",
            operator: ">",
            value: 60,
          },
          {
            field: "AverageTradeDuration",
            operator: "<",
            value: 60,
          },
          {
            field: "Duration",
            operator: ">",
            value: 259200,
          },
          {
            field: "TotalDaysTraded",
            operator: ">=",
            value: 3,
          },
        ],
      },
      {
        none: [
          {
            field: "AverageTradeDuration",
            operator: "!=",
            value: 10,
          },
          {
            field: "Foo",
            operator: "not in",
            value: [10, 11, 12],
          },
        ],
      },
    ],
  },
} as Rule;
