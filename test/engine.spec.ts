import { valid1Json } from "./rulesets/valid1.json";
import { valid2Json } from "./rulesets/valid2.json";
import { valid3Json } from "./rulesets/valid3.json";
import { valid5Json } from "./rulesets/valid5.json";
import { invalid1Json } from "./rulesets/invalid1.json";
import { invalid2Json } from "./rulesets/invalid2.json";
import { subRulesValid3Json } from "./rulesets/sub-rules-valid3.json";
import { subRulesValid1Json } from "./rulesets/sub-rules-valid1.json";
import { subRulesValid2Json } from "./rulesets/sub-rules-valid2.json";

import { Operator, RulePilot, RuleError } from "../src";
import { valid10Json } from "./rulesets/valid10.json";

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
    expect(await RulePilot.evaluate(invalid2Json, { foo: true }, true)).toEqual(
      2
    );

    expect(
      await RulePilot.evaluate(invalid2Json, { Category: "Islamic" }, true)
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

  it("Evaluates a simple ruleset with a Contains and ContainsAny any condition", async () => {
    expect(
      await RulePilot.evaluate(valid5Json, { countries: ["US", "FR"] })
    ).toEqual(true);

    expect(
      await RulePilot.evaluate(valid5Json, { countries: ["GB", "DE"] })
    ).toEqual(false);

    expect(
      await RulePilot.evaluate(valid5Json, { states: ["CA", "TN"] })
    ).toEqual(true);

    expect(
      await RulePilot.evaluate(valid5Json, { states: ["NY", "WI"] })
    ).toEqual(false);

    expect(
      await RulePilot.evaluate(valid5Json, { states: "invalid criterion type" })
    ).toEqual(false);
  });

  it("Evaluates a rule with sub-rules", async () => {
    expect(
      await RulePilot.evaluate(subRulesValid1Json, {
        CountryIso: "GB",
        Leverage: 1000,
        Monetization: "Real",
      })
    ).toEqual(12);

    expect(
      await RulePilot.evaluate(subRulesValid1Json, {
        CountryIso: "GB",
        Leverage: 1000,
        Monetization: "Real",
        Category: 910,
      })
    ).toEqual(13);

    expect(
      await RulePilot.evaluate(subRulesValid1Json, {
        CountryIso: "GB",
        Leverage: 1000,
        Monetization: "Real",
        Category: 900,
      })
    ).toEqual(13);

    expect(
      await RulePilot.evaluate(subRulesValid1Json, {
        CountryIso: "GB",
        Leverage: 500,
        Monetization: "Real",
        Category: 900,
      })
    ).toEqual(3);

    expect(
      await RulePilot.evaluate(subRulesValid1Json, {
        CountryIso: "GB",
        Leverage: 333,
        Monetization: "Real",
        Category: "Islamic",
      })
    ).toEqual(4);

    expect(
      await RulePilot.evaluate(subRulesValid3Json, {
        fieldA: "bar",
        fieldC: 600,
      })
    ).toEqual(3);

    expect(
      await RulePilot.evaluate(subRulesValid3Json, {
        fieldA: "bar",
        fieldC: 600,
        fieldD: "whoop",
      })
    ).toEqual(33);

    expect(
      await RulePilot.evaluate(subRulesValid3Json, {
        fieldA: "bar",
        fieldB: 2,
        fieldD: "whoop",
      })
    ).toEqual(33);

    expect(
      await RulePilot.evaluate(subRulesValid3Json, {
        fieldD: "whoop",
      })
    ).toEqual(5);

    expect(
      await RulePilot.evaluate(subRulesValid3Json, {
        fieldA: "value",
      })
    ).toEqual(5);
  });

  it("Evaluates a rule with sub-rules where the parent condition has a nested rule", async () => {
    expect(
      await RulePilot.evaluate(subRulesValid2Json, {
        Category: "Demo",
        Leverage: 500,
        CountryIso: "GB",
        Monetization: "Real",
      })
    ).toEqual(12);
  });

  it("Evaluates a rule with null values correctly", async () => {
    expect(await RulePilot.evaluate(valid10Json, {
      foo: null,
      bar: "test",
      foo_array: ["test", null],
      bar_array: ["test"],
    })).toEqual(true);
  });

  
});
