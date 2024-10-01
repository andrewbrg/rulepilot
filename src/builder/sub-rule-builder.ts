import { SubRule } from "../types/rule";
import { BaseBuilder } from "./base-builder.abstract";

export class SubRuleBuilder extends BaseBuilder {
  /** Stores the rule being constructed */
  #rule: SubRule = { conditions: [], result: undefined };

  /**
   * Sets the result of the subrule being constructed
   * @param value The default value of the rule
   */
  result(value: SubRule["result"]): SubRuleBuilder {
    this.#rule.result = value;
    return this;
  }
}
