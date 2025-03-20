import { valid1Json } from "./rulesets/valid1.json";
import { valid3Json } from "./rulesets/valid3.json";
import { invalid1Json } from "./rulesets/invalid1.json";
import { subRulesValid1Json } from "./rulesets/sub-rules-valid1.json";
import { valid10Json } from "./rulesets/valid10.json";

import { Operator, RulePilot, Condition, Constraint } from "../src";
import { invalid3Json } from "./rulesets/invalid3.json";

describe("RulePilot validator correctly", () => {
  it("Identifies a bad operator", () => {
    expect(
      RulePilot.validate({
        conditions: [
          {
            all: [{ field: "name", operator: "*" as Operator, value: "test" }],
          },
        ],
      }).isValid
    ).toEqual(false);
  });

  it("Identifies an invalid field", () => {
    expect(
      RulePilot.validate({
        conditions: [
          {
            all: [
              {
                field: true as unknown as string,
                operator: "==",
                value: "test",
              },
            ],
          },
        ],
      }).isValid
    ).toEqual(false);
  });

  it("Identifies an invalid condition", () => {
    expect(
      RulePilot.validate({
        conditions: [
          {
            all: [
              {
                field: "foo",
                operator: "==",
                value: "bar",
              },
            ],
            any: [],
          },
        ],
      }).isValid
    ).toEqual(false);
  });

  it("Identifies an invalid node", () => {
    expect(
      RulePilot.validate({
        conditions: [
          {
            all: [
              {
                operator: "==",
                value: "bar",
              } as Constraint,
            ],
          },
        ],
      }).isValid
    ).toEqual(false);
  });

  it("Identifies an badly constructed condition", () => {
    expect(
      RulePilot.validate({
        conditions: [
          {
            foo: [
              {
                field: "foo",
                operator: "==",
                value: "bar",
              },
            ],
          } as Condition,
        ],
      }).isValid
    ).toEqual(false);
  });

  it("Identifies an invalid rule", () => {
    const validation = RulePilot.validate(invalid1Json);

    expect(validation.isValid).toEqual(false);
    expect(validation.error?.message).toEqual(
      "Each node should be a condition or a constraint."
    );
  });

  it("Identifies an empty rule", () => {
    const validation = RulePilot.validate({ conditions: [] });

    expect(validation.isValid).toEqual(false);
    expect(validation.error?.message).toEqual(
      "The conditions property must contain at least one condition."
    );
  });

  it("Identifies invalid values for In/NotIn/ContainsAny operators", () => {
    expect(
      RulePilot.validate({
        conditions: [
          { all: [{ field: "name", operator: "in", value: "test" }] },
        ],
      }).isValid
    ).toEqual(false);

    expect(
      RulePilot.validate({
        conditions: [
          { all: [{ field: "name", operator: "not in", value: "test" }] },
        ],
      }).isValid
    ).toEqual(false);

    expect(
      RulePilot.validate({
        conditions: [
          { all: [{ field: "name", operator: "contains any", value: "test" }] },
        ],
      }).isValid
    ).toEqual(false);
  });

  it("Validates a correct rule", () => {
    expect(
      RulePilot.validate({
        conditions: [
          { all: [{ field: "name", operator: "==", value: "test" }] },
        ],
      }).isValid
    ).toEqual(true);
  });

  it("Validates a simple correct rule", () => {
    expect(RulePilot.validate(valid1Json).isValid).toEqual(true);
  });

  it("Validates a nested correct rule", () => {
    expect(RulePilot.validate(valid3Json).isValid).toEqual(true);
  });

  it("Validates a rule with sub rules correctly", async () => {
    expect(RulePilot.validate(subRulesValid1Json).isValid).toEqual(true);
  });
  it("Validates a rule with null values correctly - valid", async () => {
    expect(RulePilot.validate(valid10Json).isValid).toEqual(true);
  });
  it("Validates a rule with null values correctly - invalid", async () => {
    expect(RulePilot.validate(invalid3Json).isValid).toEqual(false);
  });
});
