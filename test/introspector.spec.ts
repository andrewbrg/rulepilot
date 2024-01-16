import { RulePilot } from "../src";

import { valid3Json } from "./rulesets/valid3.json";

describe("RulePilot introspector correctly", () => {
  it("Introspects criteria range correctly", async () => {
    console.log(RulePilot.determineCriteriaRange(valid3Json));

    expect(RulePilot.determineCriteriaRange(valid3Json)).toEqual(false);
  });
});
