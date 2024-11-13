import { valid9Json } from "./rulesets/valid9.json";
import { valid8Json } from "./rulesets/valid8.json";
import { valid7Json } from "./rulesets/valid7.json";
import { valid6Json } from "./rulesets/valid6.json";
import { valid4Json } from "./rulesets/valid4.json";
import { valid3Json } from "./rulesets/valid3.json";
import { invalid1Json } from "./rulesets/invalid1.json";

import { RuleError, RulePilot } from "../src";

describe("RulePilot introspector correctly", () => {
  it("Detects invalid rules", async () => {
    const s = ["Leverage"];

    expect(() =>
      RulePilot.introspect(
        invalid1Json,
        { field: "CountryIso", value: "GB" },
        s
      )
    ).toThrow(RuleError);
  });

  it("Introspects valid rules", async () => {
    let sub: string[] = ["Leverage"];
    let con: any = { field: "CountryIso", value: "GB" };
    expect(RulePilot.introspect(valid3Json, con, sub)).toEqual({
      3: {
        Leverage: [
          { value: 1000, operator: ">=" },
          { value: 200, operator: "<" },
        ],
      },
    });

    sub = ["Monetization"];
    con = { field: "Leverage", value: 199 };
    expect(RulePilot.introspect(valid3Json, con, sub)).toEqual({
      3: { Monetization: [{ value: "Real", operator: "==" }] },
    });

    sub = ["Monetization"];
    con = { field: "Leverage", value: 200 };
    expect(RulePilot.introspect(valid3Json, con, sub)).toEqual({});

    sub = ["Leverage"];
    con = { field: "Category", value: 22 };
    expect(RulePilot.introspect(valid4Json, con, sub)).toEqual({
      3: {
        Leverage: [
          { value: 1000, operator: "==" },
          { value: 500, operator: "==" },
          { value: 200, operator: "<" },
        ],
      },
    });

    sub = ["Category"];
    con = { field: "Leverage", value: 199 };
    expect(RulePilot.introspect(valid4Json, con, sub)).toEqual({
      3: {
        Category: [
          { value: 1000, operator: ">=" },
          { value: 22, operator: "==" },
          { value: 11, operator: "==" },
          { value: 12, operator: "==" },
        ],
      },
      4: { Category: [{ value: "Islamic", operator: "==" }] },
    });

    sub = ["IsUnder18"];
    con = { field: "Category", value: "Islamic" };
    expect(RulePilot.introspect(valid6Json, con, sub)).toEqual({});

    sub = ["IsUnder18"];
    con = { field: "Category", value: 122 };
    expect(RulePilot.introspect(valid6Json, con, sub)).toEqual({});

    sub = ["Monetization"];
    con = { field: "Category", value: 11 };
    expect(RulePilot.introspect(valid6Json, con, sub)).toEqual({});

    sub = ["Leverage"];
    con = { field: "CountryIso", value: "DK" };
    expect(RulePilot.introspect(valid7Json, con, sub)).toEqual({
      3: {
        Leverage: [
          { value: 1000, operator: "<" },
          { value: 200, operator: ">=" },
        ],
      },
    });

    sub = ["Leverage"];
    con = { field: "CountryIso", value: "FI" };
    expect(RulePilot.introspect(valid7Json, con, sub)).toEqual({});

    sub = ["OtherType"];
    con = { field: "Leverage", value: 999 };
    expect(RulePilot.introspect(valid8Json, con, sub)).toEqual({
      3: { OtherType: [{ value: ["Live", "Fun"], operator: "in" }] },
    });

    sub = ["totalCheckoutPrice"];
    con = { field: "country", value: "SE" };
    expect(RulePilot.introspect(valid9Json, con, sub)).toEqual({});
  });
});
