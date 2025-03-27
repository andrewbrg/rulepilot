import { Rule } from "../../src";

export const valid11Json: Rule = {
  conditions: [
    {
      all: [
        {
          field: "category",
          operator: "==",
          value: "demo",
        },
        {
          all: [
            {
              field: "monetization",
              operator: "==",
              value: "demo",
            },
            {
              field: "currency",
              operator: "==",
              value: "USD",
            },
          ],
          result: {
            groupId: 10997667,
            spreadPlan: "UBRK-GEN",
            commissionPlan: "UBRK-GEN-USD",
          },
        },
      ],
    },
    {
      all: [
        {
          field: "category",
          operator: "==",
          value: "ecn",
        },
        {
          all: [
            {
              field: "monetization",
              operator: "==",
              value: "demo",
            },
            {
              field: "currency",
              operator: "==",
              value: "USD",
            },
          ],
          result: {
            groupId: 10997668,
            spreadPlan: "UBRK-GEN",
            commissionPlan: "UBRK-GEN-USD",
          },
        },
        {
          all: [
            {
              field: "monetization",
              operator: "==",
              value: "demo",
            },
            {
              field: "currency",
              operator: "==",
              value: "EUR",
            },
          ],
          result: {
            groupId: 10997668,
            spreadPlan: "UBRK-GEN",
            commissionPlan: "UBRK-GEN-EUR",
          },
        },
        {
          all: [
            {
              field: "monetization",
              operator: "==",
              value: "demo",
            },
            {
              field: "currency",
              operator: "==",
              value: "BTC",
            },
          ],
          result: {
            groupId: 10997668,
            spreadPlan: "UBRK-GEN",
            commissionPlan: "UBRK-GEN-BTC",
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
        {
          all: [
            {
              field: "monetization",
              operator: "==",
              value: "demo",
            },
            {
              field: "currency",
              operator: "==",
              value: "USD",
            },
          ],
          result: {
            groupId: 10997669,
            spreadPlan: "UBRK-GEN",
            commissionPlan: "UBRK-GEN-USD",
          },
        },
      ],
    },
  ],
};
