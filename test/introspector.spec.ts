import { RulePilot } from "../src";

import { valid3Json } from "./rulesets/valid3.json";
import { valid4Json } from "./rulesets/valid4.json";
import { valid6Json } from "./rulesets/valid6.json";
import { valid7Json } from "./rulesets/valid7.json";
import { valid8Json } from "./rulesets/valid8.json";

describe("RulePilot introspector correctly", () => {
  it("Introspects various rules", async () => {
    expect(RulePilot.introspect(valid3Json)).toEqual({
      results: [
        {
          result: 3,
          options: [
            { Leverage: { operator: ">=", value: 1000 } },
            {
              CountryIso: ["GB", "FI"],
              Leverage: { operator: "<", value: 200 },
              Monetization: "Real",
            },
          ],
        },
        { result: 4, options: [{ Category: "Islamic" }] },
      ],
      default: 2,
    });

    expect(RulePilot.introspect(valid4Json)).toEqual({
      results: [
        {
          result: 3,
          options: [
            { Leverage: [1000, 500] },
            {
              CountryIso: { operator: "contains", value: ["GB", "FI"] },
              Leverage: { operator: "<", value: 200 },
              Monetization: "Real",
              Category: [{ operator: ">=", value: 1000 }, 22, 11, 12],
            },
            {
              CountryIso: { operator: "contains", value: ["GB", "FI"] },
              Leverage: { operator: "<", value: 200 },
              Monetization: "Real",
              Category: [{ operator: ">=", value: 1000 }, 22],
              HasStudentCard: true,
              IsUnder18: true,
            },
          ],
        },
        { result: 4, options: [{ Category: "Islamic" }] },
      ],
      default: 2,
    });

    expect(RulePilot.introspect(valid6Json)).toEqual({
      results: [
        {
          result: 3,
          options: [
            { Leverage: [1000, 500] },
            {
              CountryIso: { operator: "contains", value: ["GB", "FI"] },
              Leverage: { operator: "<", value: 200 },
              Monetization: "Real",
              Category: [{ operator: ">=", value: 1000 }, 22, 11, 12],
            },
            {
              CountryIso: { operator: "contains", value: ["GB", "FI"] },
              Leverage: { operator: "<", value: 200 },
              Monetization: "Real",
              Category: [{ operator: ">=", value: 1000 }, 22, 122],
              IsUnder18: true,
            },
          ],
        },
        { result: 4, options: [{ Category: "Islamic" }] },
      ],
      default: 2,
    });

    expect(RulePilot.introspect(valid7Json)).toEqual({
      results: [
        {
          result: 3,
          options: [
            {
              Leverage: [
                { operator: "<", value: 1000 },
                { operator: ">=", value: 200 },
              ],
              CountryIso: { operator: "not in", value: ["GB", "FI"] },
              Monetization: { operator: "!=", value: "Real" },
            },
          ],
        },
        {
          result: 4,
          options: [{ Category: { operator: "!=", value: "Islamic" } }],
        },
      ],
    });

    expect(RulePilot.introspect(valid8Json)).toEqual({
      results: [
        {
          result: 3,
          options: [
            {
              Leverage: { operator: "<", value: 1000 },
              Type: "Demo",
              OtherType: ["Live", "Fun"],
            },
            {
              Leverage: [
                { operator: "<", value: 1000 },
                { operator: ">=", value: 200 },
              ],
              CountryIso: { operator: "not in", value: ["GB", "FI"] },
              Monetization: { operator: "!=", value: "Real" },
            },
          ],
        },
        {
          result: 4,
          options: [{ Category: { operator: "!=", value: "Islamic" } }],
        },
      ],
    });
  });
});
