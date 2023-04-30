import { Rule, RulePilot } from "../src";

describe("RulePilot builder correctly", () => {
  it("Creates a valid ruleset", () => {
    const builder = RulePilot.builder();
    expect(
      RulePilot.validate(
        builder
          .add(
            builder.condition("all", [
              builder.constraint("field", "==", "value"),
            ])
          )
          .build()
      ).isValid
    ).toEqual(true);
  });

  it("Creates a complex ruleset properly", () => {
    const builder = RulePilot.builder();

    const rule: Rule = builder
      .add(
        builder.condition(
          "all",
          [
            builder.condition("any", [
              builder.constraint("fieldA", "==", "bar"),
              builder.constraint("fieldB", ">=", 2),
            ]),
            builder.constraint("fieldC", "not in", [1, 2, 3]),
          ],
          3
        )
      )
      .add(builder.condition("none", [], 5))
      .add(
        builder.condition("any", [builder.constraint("fieldA", "==", "value")])
      )
      .default(2)
      .build(true);

    expect(rule).toEqual({
      conditions: [
        {
          all: [
            {
              any: [
                { field: "fieldA", operator: "==", value: "bar" },
                { field: "fieldB", operator: ">=", value: 2 },
              ],
            },
            { field: "fieldC", operator: "not in", value: [1, 2, 3] },
          ],
          result: 3,
        },
        { none: [], result: 5 },
        {
          any: [{ field: "fieldA", operator: "==", value: "value" }],
        },
      ],
      default: 2,
    });
  });

  it("Throws an error when validating an invalid ruleset", () => {
    const builder = RulePilot.builder();
    expect(() =>
      builder
        .add(
          builder.condition(
            "all",
            [
              builder.condition(
                "any",
                [
                  builder.constraint("fieldA", "==", "bar"),
                  builder.constraint("fieldB", ">=", 2),
                ],
                "Invalid!!"
              ),
              builder.constraint("fieldC", "not in", [1, 2, 3]),
            ],
            3
          )
        )
        .build(true)
    ).toThrowError();
  });
});
