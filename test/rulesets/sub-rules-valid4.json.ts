import { Rule } from "../../src";

export const subRulesValidJson4: Rule = {
  conditions: [
    {
      all: [
        {
          field: "category",
          operator: "!=",
          value: "islamic",
        },
        {
          all: [
            {
              field: "currency",
              operator: "==",
              value: "USD",
            },
          ],
          result: {
            groupId: 15,
          },
        },
        {
          all: [
            {
              field: "currency",
              operator: "==",
              value: "CAD",
            },
          ],
          result: {
            groupId: 15,
          },
        },
        {
          all: [
            {
              field: "currency",
              operator: "==",
              value: "EUR",
            },
          ],
          result: {
            groupId: 15,
          },
        },
        {
          all: [
            {
              field: "currency",
              operator: "==",
              value: "GBP",
            },
          ],
          result: {
            groupId: 15,
          },
        },
        {
          all: [
            {
              field: "currency",
              operator: "==",
              value: "AUD",
            },
          ],
          result: {
            groupId: 15,
          },
        },
        {
          all: [
            {
              field: "currency",
              operator: "==",
              value: "BIT",
            },
          ],
          result: {
            groupId: 15,
          },
        },
      ],
    },
    {
      all: [
        {
          field: "category",
          operator: "==",
          value: "islamic",
        },
      ],
      result: {
        groupId: 17,
      },
    },
  ],
};
