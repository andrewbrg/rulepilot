import { Operator, RulePilot } from "../src";

import { valid3Json } from "./rulesets/valid3.json";
import { valid4Json } from "./rulesets/valid4.json";

describe("RulePilot introspector correctly", () => {
  it("Introspects criteria range correctly", async () => {
    console.log(RulePilot.determineCriteriaRange(valid3Json));

    expect(RulePilot.determineCriteriaRange(valid3Json)).toEqual(false);
  });
});
