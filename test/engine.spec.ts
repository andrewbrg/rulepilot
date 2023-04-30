import { RulePilot, Operator } from "../src";

import { valid1Json } from "./rulesets/valid1.json";
import { valid2Json } from "./rulesets/valid2.json";
import { valid3Json } from "./rulesets/valid3.json";
import { valid4Json } from "./rulesets/valid4.json";

import { invalid1Json } from "./rulesets/invalid1.json";

describe("RulePilot engine correctly", () => {
  it("Evaluates a simple ruleset", () => {
    expect(RulePilot.evaluate(valid1Json, { ProfitPercentage: 20 })).toEqual(
      true
    );
    expect(RulePilot.evaluate(valid1Json, { ProfitPercentage: 2 })).toEqual(
      false
    );
    expect(
      RulePilot.evaluate(valid1Json, {
        WinRate: 80,
        AverageTradeDuration: 5,
        Duration: 9000000,
      })
    ).toEqual(false);
    expect(
      RulePilot.evaluate(valid1Json, {
        WinRate: 80,
        AverageTradeDuration: 5,
        Duration: 9000000,
        TotalDaysTraded: 5,
      })
    ).toEqual(true);
  });

  it("Evaluates to false if operator is unknown", () => {
    expect(
      RulePilot.evaluate(
        {
          conditions: [
            {
              all: [
                { field: "name", operator: "foo" as Operator, value: "test" },
              ],
            },
          ],
        },
        { name: "test" },
        true
      )
    ).toEqual(false);
  });

  it("Throws an error on invalid not runnable ruleset", () => {
    expect(() => RulePilot.evaluate({ conditions: [] }, {})).toThrow(Error);
  });

  it("Evaluates an invalid but runnable ruleset if marked as trusted", () => {
    expect(RulePilot.evaluate(invalid1Json, {}, true)).toEqual(2);
  });

  it("Evaluates a nested ruleset", () => {
    expect(RulePilot.evaluate(valid3Json, {})).toEqual(2);
    expect(RulePilot.evaluate(valid3Json, { Category: "Islamic" })).toEqual(4);
    expect(RulePilot.evaluate(valid3Json, { Monetization: "Real" })).toEqual(2);
    expect(RulePilot.evaluate(valid3Json, { Leverage: 1000 })).toEqual(3);
    expect(RulePilot.evaluate(valid3Json, { Leverage: 999 })).toEqual(2);
    expect(
      RulePilot.evaluate(valid3Json, {
        Monetization: "Real",
        Leverage: 150,
        CountryIso: "FI",
      })
    ).toEqual(3);
    expect(
      RulePilot.evaluate(valid3Json, {
        Monetization: "Real",
        Leverage: 150,
        CountryIso: "FI",
        foo: "bar",
        another: false,
      })
    ).toEqual(3);
  });

  it("Evaluates a simple ruleset with redundant condition", () => {
    expect(RulePilot.evaluate(valid4Json, { foo: true }, true)).toEqual(2);
    expect(
      RulePilot.evaluate(valid4Json, { Category: "Islamic" }, true)
    ).toEqual(4);
  });

  it("Evaluates a simple ruleset with none type condition", () => {
    expect(
      RulePilot.evaluate(valid2Json, {
        Leverage: 100,
        WinRate: 80,
        AverageTradeDuration: 5,
        Duration: 9000000,
        TotalDaysTraded: 5,
      })
    ).toEqual(true);

    expect(
      RulePilot.evaluate(valid2Json, {
        AverageTradeDuration: 10,
        Foo: 10,
      })
    ).toEqual(true);
  });
});
