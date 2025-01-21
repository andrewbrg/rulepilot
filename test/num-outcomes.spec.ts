import { valid7Json } from "./rulesets/valid7.json";
import { valid6Json } from "./rulesets/valid6.json";
import { valid5Json } from "./rulesets/valid5.json";
import { valid4Json } from "./rulesets/valid4.json";
import { valid3Json } from "./rulesets/valid3.json";
import { invalid1Json } from "./rulesets/invalid1.json";

import { RuleError, RulePilot } from "../src";

describe("RulePilot correctly determines the number of possible outcomes", () => {
  it("Detects invalid rules", async () => {
    expect(() => RulePilot.numOutcomes(invalid1Json)).toThrow(RuleError);
  });

  expect(RulePilot.numOutcomes(valid3Json)).toEqual(3);

  expect(RulePilot.numOutcomes(valid4Json)).toEqual(3);

  expect(RulePilot.numOutcomes(valid5Json)).toEqual(1);

  expect(RulePilot.numOutcomes(valid6Json)).toEqual(3);

  expect(RulePilot.numOutcomes(valid7Json)).toEqual(2);
});
