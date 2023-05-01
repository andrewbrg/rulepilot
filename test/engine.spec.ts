import { RulePilot, Operator, RuleError } from "../src";

import { valid1Json } from "./rulesets/valid1.json";
import { valid2Json } from "./rulesets/valid2.json";
import { valid3Json } from "./rulesets/valid3.json";
import { valid4Json } from "./rulesets/valid4.json";

import { invalid1Json } from "./rulesets/invalid1.json";

describe("RulePilot engine correctly", () => {
  it("Evaluates a simple ruleset", async () => {
    expect(
      await RulePilot.evaluate(valid1Json, { ProfitPercentage: 20 })
    ).toEqual(true);

    expect(
      await RulePilot.evaluate(valid1Json, { ProfitPercentage: 2 })
    ).toEqual(false);

    expect(
      await RulePilot.evaluate(valid1Json, {
        WinRate: 80,
        AverageTradeDuration: 5,
        Duration: 9000000,
      })
    ).toEqual(false);

    expect(
      await RulePilot.evaluate(valid1Json, {
        WinRate: 80,
        AverageTradeDuration: 5,
        Duration: 9000000,
        TotalDaysTraded: 5,
      })
    ).toEqual(true);
  });

  it("Evaluates to false if operator is unknown", async () => {
    expect(
      await RulePilot.evaluate(
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

  it("Resolves nested field definitions", async () => {
    expect(
      await RulePilot.evaluate(
        {
          conditions: [
            {
              all: [{ field: "foo.bar", operator: "==", value: "test" }],
            },
          ],
        },
        {
          foo: {
            bar: "test",
          },
        }
      )
    ).toEqual(true);
  });

  it("Handles missing nested field definitions", async () => {
    expect(
      await RulePilot.evaluate(
        {
          conditions: [
            {
              all: [{ field: "foo.foo", operator: "==", value: "test" }],
            },
          ],
        },
        {
          foo: {
            bar: "test",
          },
        }
      )
    ).toEqual(false);
  });

  it("Handles array of criteria properly", async () => {
    expect(
      await RulePilot.evaluate(
        {
          conditions: [
            {
              all: [{ field: "foo.bar", operator: "==", value: "bar" }],
            },
          ],
        },
        [
          {
            foo: {
              bar: "test",
            },
          },
          {
            foo: {
              bar: "bar",
            },
          },
          {},
        ]
      )
    ).toEqual([false, true, false]);
  });

  it("Throws an error on invalid not runnable ruleset", () => {
    expect(
      async () => await RulePilot.evaluate({ conditions: [] }, {})
    ).rejects.toThrow(RuleError);
  });

  it("Evaluates an invalid but runnable ruleset if marked as trusted", async () => {
    expect(await RulePilot.evaluate(invalid1Json, {}, true)).toEqual(2);
  });

  it("Evaluates a nested ruleset", async () => {
    expect(await RulePilot.evaluate(valid3Json, {})).toEqual(2);
    expect(await RulePilot.evaluate(valid3Json, { Leverage: 1000 })).toEqual(3);
    expect(await RulePilot.evaluate(valid3Json, { Leverage: 999 })).toEqual(2);

    expect(
      await RulePilot.evaluate(valid3Json, { Category: "Islamic" })
    ).toEqual(4);

    expect(
      await RulePilot.evaluate(valid3Json, { Monetization: "Real" })
    ).toEqual(2);

    expect(
      await RulePilot.evaluate(valid3Json, {
        Monetization: "Real",
        Leverage: 150,
        CountryIso: "FI",
      })
    ).toEqual(3);

    expect(
      await RulePilot.evaluate(valid3Json, {
        Monetization: "Real",
        Leverage: 150,
        CountryIso: "FI",
        foo: "bar",
        another: false,
      })
    ).toEqual(3);
  });

  it("Evaluates a simple ruleset with redundant condition", async () => {
    expect(await RulePilot.evaluate(valid4Json, { foo: true }, true)).toEqual(
      2
    );

    expect(
      await RulePilot.evaluate(valid4Json, { Category: "Islamic" }, true)
    ).toEqual(4);
  });

  it("Evaluates a simple ruleset with none type condition", async () => {
    expect(
      await RulePilot.evaluate(valid2Json, {
        Leverage: 100,
        WinRate: 80,
        AverageTradeDuration: 5,
        Duration: 9000000,
        TotalDaysTraded: 5,
      })
    ).toEqual(true);

    expect(
      await RulePilot.evaluate(valid2Json, {
        AverageTradeDuration: 10,
        Foo: 10,
      })
    ).toEqual(true);
  });
});
