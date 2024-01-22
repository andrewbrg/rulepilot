import { RulePilot } from "../src";

import { valid3Json } from "./rulesets/valid3.json";

describe("RulePilot introspector correctly", () => {
  it("Introspects criteria range correctly", async () => {
    console.log(RulePilot.introspect(valid3Json));

    expect(RulePilot.introspect(valid3Json)).toEqual(false);
  });
});
