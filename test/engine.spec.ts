import { RuleEngine, Operator } from "../src";

import { simpleValidJson } from "./rulesets/simple-valid.json";
import { simpleValidTwoJson } from "./rulesets/simple-valid-two.json";
import { simpleInValidJson } from "./rulesets/simple-invalid.json";

import { nestedValidJson } from "./rulesets/nested-valid.json";
import { nestedInValidJson } from "./rulesets/nested-invalid.json";

describe("The RuleEngine correctly", () => {
  it("Validates a good ruleset", () => {
    expect(
      RuleEngine.validate({
        conditions: [
          { all: [{ field: "name", operator: Operator.Equal, value: "test" }] },
        ],
      }).isValid
    ).toEqual(true);
  });

  it("Identifies a bad operator", () => {
    expect(
      RuleEngine.validate({
        conditions: [
          { all: [{ field: "name", operator: "*", value: "test" }] },
        ],
      }).isValid
    ).toEqual(false);
  });

  it("Identifies an invalid ruleset", () => {
    const validation = RuleEngine.validate(nestedInValidJson);

    expect(validation.isValid).toEqual(false);
    expect(validation.error.message).toEqual(
      "Nested conditions cannot have a result property."
    );
  });

  it("Identifies an empty ruleset", () => {
    const validation = RuleEngine.validate(simpleInValidJson);

    expect(validation.isValid).toEqual(false);
    expect(validation.error.message).toEqual("Invalid condition structure.");
  });

  it("Detects invalid values for In/Not In operators", () => {
    expect(
      RuleEngine.validate({
        conditions: [
          { all: [{ field: "name", operator: Operator.In, value: "test" }] },
        ],
      }).isValid
    ).toEqual(false);

    expect(
      RuleEngine.validate({
        conditions: [
          { all: [{ field: "name", operator: Operator.NotIn, value: "test" }] },
        ],
      }).isValid
    ).toEqual(false);
  });

  it("Validates a simple ruleset", () => {
    expect(RuleEngine.validate(simpleValidJson).isValid).toEqual(true);
  });

  it("Evaluates a simple ruleset", () => {
    expect(
      RuleEngine.evaluate(simpleValidJson, { ProfitPercentage: 20 })
    ).toEqual(true);
    expect(
      RuleEngine.evaluate(simpleValidJson, { ProfitPercentage: 2 })
    ).toEqual(false);
    expect(
      RuleEngine.evaluate(simpleValidJson, {
        WinRate: 80,
        AverageTradeDuration: 5,
        Duration: 9000000,
      })
    ).toEqual(false);
    expect(
      RuleEngine.evaluate(simpleValidJson, {
        WinRate: 80,
        AverageTradeDuration: 5,
        Duration: 9000000,
        TotalDaysTraded: 5,
      })
    ).toEqual(true);
  });

  it("Throws an error on invalid not runnable ruleset", () => {
    expect(() => RuleEngine.evaluate(simpleInValidJson, {})).toThrow(Error);
  });

  it("Evaluates an invalid but runnable ruleset if marked as trusted", () => {
    expect(RuleEngine.evaluate(nestedInValidJson, {}, true)).toEqual(2);
  });

  it("Validates a nested ruleset", () => {
    expect(RuleEngine.validate(nestedValidJson).isValid).toEqual(true);
  });

  it("Evaluates a nested ruleset", () => {
    expect(RuleEngine.evaluate(nestedValidJson, {})).toEqual(2);
    expect(
      RuleEngine.evaluate(nestedValidJson, { Category: "Islamic" })
    ).toEqual(4);
    expect(
      RuleEngine.evaluate(nestedValidJson, { Monetization: "Real" })
    ).toEqual(2);
    expect(RuleEngine.evaluate(nestedValidJson, { Leverage: 1000 })).toEqual(3);
    expect(RuleEngine.evaluate(nestedValidJson, { Leverage: 999 })).toEqual(2);
    expect(
      RuleEngine.evaluate(nestedValidJson, {
        Monetization: "Real",
        Leverage: 150,
        CountryIso: "FI",
      })
    ).toEqual(3);
    expect(
      RuleEngine.evaluate(nestedValidJson, {
        Monetization: "Real",
        Leverage: 150,
        CountryIso: "FI",
        foo: "bar",
        another: false,
      })
    ).toEqual(3);
  });

  it("Validates a simple ruleset with redundant condition", () => {
    expect(RuleEngine.validate(simpleValidTwoJson).isValid).toEqual(true);
  });

  it("Evaluates a simple ruleset with none type condition", () => {
    expect(
      RuleEngine.evaluate(simpleValidTwoJson, {
        Leverage: 100,
        WinRate: 80,
        AverageTradeDuration: 5,
        Duration: 9000000,
        TotalDaysTraded: 5,
      })
    ).toEqual(true);

    expect(
      RuleEngine.evaluate(simpleValidTwoJson, {
        AverageTradeDuration: 10,
        Foo: 10,
      })
    ).toEqual(true);
  });
});
