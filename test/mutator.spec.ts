import axios from "axios";
import { beforeEach } from "@jest/globals";

import { RulePilot } from "../src";
import { valid1Json } from "./rulesets/valid1.json";
import { valid3Json } from "./rulesets/valid3.json";

const mutation1 = async (value) => {
  const result = await axios.get(
    `https://restcountries.com/v3.1/name/${value}?fullText=true`
  );
  return result.data[0].cca2;
};

const mutation2 = async (value) => {
  const result = await axios.get(
    `https://restcountries.com/v3.1/name/${value[0]}?fullText=true`
  );
  return result.data[0].cca2;
};

const criteria = [
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
];

describe("RulePilot mutator correctly", () => {
  beforeEach(() => {
    console.debug = jest.fn();
    process.env.DEBUG = "true";
  });

  it("Performs desired mutation", async () => {
    const rp = new RulePilot();

    rp.addMutation("ProfitPercentage", (value) => value * 2);
    expect(await rp.evaluate(valid1Json, { ProfitPercentage: 5 })).toEqual(
      true
    );
  });

  it("Performs multiple mutations", async () => {
    const rp = new RulePilot();

    rp.addMutation("WinRate", (value) => value * 2);
    rp.addMutation("AverageTradeDuration", (value) => value / 2);

    expect(
      await rp.evaluate(valid1Json, {
        WinRate: 31,
        AverageTradeDuration: 60,
        Duration: 99999999,
        TotalDaysTraded: 3,
      })
    ).toEqual(true);
  });

  it("Performs async mutation", async () => {
    const rp = new RulePilot();

    rp.addMutation("CountryIso", mutation1);

    expect(
      await rp.evaluate(valid3Json, {
        CountryIso: "United Kingdom",
        Leverage: 60,
        Monetization: "Real",
        foo: {
          CountryIso: "United Kingdom",
        },
      })
    ).toEqual(3);
  });

  it("Performs nested mutation", async () => {
    const rp = new RulePilot();

    rp.addMutation("foo.bar", (value) => value * 2);
    expect(
      await rp.evaluate(
        {
          conditions: [
            {
              all: [{ field: "foo.bar", operator: ">", value: 6 }],
            },
          ],
        },
        { foo: { bar: 5 } }
      )
    ).toEqual(true);
  });

  it("Caches async mutation results", async () => {
    const rp = new RulePilot();

    rp.addMutation("Leverage", (value) => value);
    rp.addMutation("CountryIso", mutation1);

    const result = await rp.evaluate(valid3Json, criteria);

    expect(console.debug).toBeCalledWith(
      'Waiting on mutation "CountryIso" with param "United Kingdom"'
    );
    expect(console.debug).toBeCalledTimes(9);
    expect(result).toEqual([3, 2, 3]);
  });

  it("Performs a migration with an array parameter", async () => {
    const rp = new RulePilot();

    rp.addMutation("CountryIso", mutation2);

    const result = await rp.evaluate(
      {
        conditions: [
          {
            all: [{ field: "CountryIso", operator: "==", value: "GB" }],
          },
        ],
      },
      { CountryIso: ["United Kingdom", "Finland"] }
    );

    expect(result).toEqual(true);
  });

  it("Performs a migration with a nested array parameter", async () => {
    const rp = new RulePilot();

    rp.addMutation("foo.bar", mutation2);

    const result = await rp.evaluate(
      {
        conditions: [
          {
            all: [{ field: "foo.bar", operator: "==", value: "GB" }],
          },
        ],
      },
      { foo: { bar: ["United Kingdom", "Finland"] } }
    );

    expect(result).toEqual(true);
  });

  it("Mutation cache works properly", async () => {
    const rp = new RulePilot();

    rp.addMutation("Leverage", (value) => value);
    rp.addMutation("CountryIso", mutation1);

    await rp.evaluate(valid3Json, criteria);

    setTimeout(async () => {
      const result = await rp.evaluate(valid3Json, criteria);
      expect(console.debug).toBeCalledWith(
        'Cache hit on "CountryIso" with param "United Kingdom"'
      );
      expect(result).toEqual([3, 2, 3]);
    }, 1500);
  });

  it("Removes a mutation properly", async () => {
    const rp = new RulePilot();

    rp.addMutation("CountryIso", mutation1);
    rp.removeMutation("CountryIso");

    const result = await rp.evaluate(valid3Json, {
      CountryIso: "United Kingdom",
      Leverage: 60,
      Monetization: "Real",
    });

    expect(console.debug).not.toHaveBeenCalled();
    expect(result).toEqual(2);
  });

  it("Clears mutation cache properly", async () => {
    const rp = new RulePilot();

    rp.addMutation("CountryIso", mutation1);

    await rp.evaluate(valid3Json, {
      CountryIso: "United Kingdom",
      Leverage: 60,
      Monetization: "Real",
    });

    rp.clearMutationCache("CountryIso");

    const result = await rp.evaluate(valid3Json, {
      CountryIso: "United Kingdom",
      Leverage: 60,
      Monetization: "Real",
    });

    expect(console.debug).not.toHaveBeenCalledWith(
      'Waiting on mutation "CountryIso" with param "United Kingdom"'
    );
    expect(result).toEqual(3);
  });

  it("Clears all mutation cache properly", async () => {
    const rp = new RulePilot();

    rp.addMutation("CountryIso", mutation1);

    await rp.evaluate(valid3Json, {
      CountryIso: "United Kingdom",
      Leverage: 60,
      Monetization: "Real",
    });

    rp.clearMutationCache();

    const result = await rp.evaluate(valid3Json, {
      CountryIso: "United Kingdom",
      Leverage: 60,
      Monetization: "Real",
    });

    expect(console.debug).not.toHaveBeenCalledWith(
      'Waiting on mutation "CountryIso" with param "United Kingdom"'
    );
    expect(result).toEqual(3);
  });

  it("Static methods behave as expected", async () => {
    const rp = new RulePilot();

    RulePilot.addMutation("CountryIso", mutation1);

    const result1 = await RulePilot.evaluate(valid3Json, {
      CountryIso: "United Kingdom",
      Leverage: 60,
      Monetization: "Real",
    });

    expect(result1).toEqual(3);

    RulePilot.removeMutation("CountryIso");
    const result2 = await rp.evaluate(valid3Json, {
      CountryIso: "United Kingdom",
      Leverage: 60,
      Monetization: "Real",
    });

    expect(result2).toEqual(2);

    RulePilot.clearMutationCache();
    const result3 = await rp.evaluate(valid3Json, {
      CountryIso: "United Kingdom",
      Leverage: 60,
      Monetization: "Real",
    });

    expect(console.debug).not.toHaveBeenCalledWith(
      'Waiting on mutation "CountryIso" with param "United Kingdom"'
    );
    expect(result3).toEqual(2);
  });
});
