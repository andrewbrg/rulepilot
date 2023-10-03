import { Rule } from "../../src";

export const valid5Json: Rule = {
  conditions: {
    any: [
      {
        field: "countries",
        operator: "contains",
        value: "US"
      },
      {
        field: "states",
        operator: "contains any",
        value: ["KY", "TN"]
      },
    ],
  },
};
