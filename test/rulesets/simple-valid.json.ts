import { Rule } from "../../src";

export const simpleValidJson: Rule = {
  conditions: {
    any: [
      {
        all: [
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
        all: [
          {
            field: "ProfitPercentage",
            operator: ">=",
            value: 10,
          },
        ],
      },
    ],
  },
};
