import axios from "axios";

import { RulePilot } from "../src";
import { valid1Json } from "./rulesets/valid1.json";
import { valid3Json } from "./rulesets/valid3.json";

describe("RulePilot mutator correctly", () => {
  it("Performs desired mutation", async () => {
    const r = new RulePilot();
    r.addMutation("ProfitPercentage", (value) => value * 2);

    expect(await r.evaluate(valid1Json, { ProfitPercentage: 5 })).toEqual(true);
  });

  it("Performs multiple mutations", async () => {
    const r = new RulePilot();
    r.addMutation("WinRate", (value) => value * 2);
    r.addMutation("AverageTradeDuration", (value) => value / 2);

    expect(
      await r.evaluate(valid1Json, {
        WinRate: 31,
        AverageTradeDuration: 60,
        Duration: 99999999,
        TotalDaysTraded: 3,
      })
    ).toEqual(true);
  });

  it("Performs async mutation", async () => {
    const r = new RulePilot();
    r.addMutation("CountryIso", async (value) => {
      const result = await axios.get(
        `https://restcountries.com/v3.1/name/${value}?fullText=true`
      );
      return result.data[0].cca2;
    });

    expect(
      await r.evaluate(valid3Json, {
        CountryIso: "United Kingdom",
        Leverage: 60,
        Monetization: "Real",
      })
    ).toEqual(3);
  });

  it("Caches async mutation results", async () => {
    const r = new RulePilot();
    r.addMutation("CountryIso", async (value) => {
      const result = await axios.get(
        `https://restcountries.com/v3.1/name/${value}?fullText=true`
      );
      return result.data[0].cca2;
    });

    expect(
      await r.evaluate(valid3Json, [
        {
          CountryIso: "United Kingdom",
          Leverage: 60,
          Monetization: "Real",
        },
        {
          CountryIso: "United Kingdom",
          Leverage: 200,
          Monetization: "Real",
        },
        {
          CountryIso: "United Kingdom",
          Leverage: 60,
          Monetization: "Real",
        },
      ])
    ).toBeTruthy();
  });
});
