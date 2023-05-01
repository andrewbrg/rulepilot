<img src=".github/logo.png" width="190" alt="RulePilot" />

[![npm version](https://badge.fury.io/js/rulepilot.svg)](https://badge.fury.io/js/rulepilot)

| Statements                                                                  | Functions                                                                  | Lines                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ![Statements](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg) | ![Functions](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg) | ![Lines](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg) |

## Overview

`RulePilot` is a fast and lightweight rule engine for JavaScript. It is designed to be simple to use and easy to
integrate into your application.

The rule engine evaluates human-readable JSON rules against a set of criteria. The rules are evaluated in a top-down
fashion.

Simple rules can be written to evaluate to a `boolean` value _(indicating whether the criteria tested passes the rule)_.

Otherwise, granular rules can be created, where each condition of the rule can evaluate to a `boolean`, `number`,
`string`, `object` or `array`. This is particularly useful when you want to evaluate a rule and return a result based on
each condition's evaluation.

## Features

- Simple to use
- Written in TypeScript
- Human-readable JSON rules
- Runs in both Node & the browser
- Lightweight with **zero dependencies** & Fast _(10,000 rule evaluations in ~35-40ms)_
- Fluent rule builder tool (ORM style)
- Both Simple & Granular rule evaluation
- Infinite condition nesting
- Dynamic criteria mutation
- Supports Criteria objects with nested properties
- Rule validation & debugging tools
- Supports `Any`, `All`, and `None` type conditions
- Supports `Equal`, `NotEqual`, `GreaterThan`, `GreaterThanOrEqual`, `LessThan`, `LessThanOrEqual`, `In`, and `NotIn` operators

## Usage

### Installation

```bash
npm install rulepilot
```

```bash
yarn add rulepilot
```

### Importing

```typescript
import { RulePilot } from "rulepilot";
```

For TypeScript users, you can import the `Rule` interface to get type definitions for the rule JSON.

```typescript
import { RulePilot, Rule } from "rulepilot";

const rule: Rule = {
  // ...
};
```

### Static vs Instantiated Approach

The `RulePilot` library can be used in two ways, either as a static class or as an instance.

The static class is great for most cases as long as you do not intend to use different mutations in multiple places 
in your codebase, _(more on what mutations are further down)_.

Otherwise, you can create an instance of the `RulePilot` class and use it to evaluate rules.

```typescript
import { RulePilot } from "rulepilot";

let result;

// Static
result = await RulePilot.evaluate(rule, criteria);

// Instance
const rulePilot = new RulePilot();
result = await rulePilot.evaluate(rule, criteria);
```

### Basic Example

Here we are defining a rule which will evaluate to `true` or `false` based on the criteria provided. In this example,
we are checking whether a user is allowed to benefit from a discount at checkout of not.

For the discount to be applied, the user must be from either the `UK or Finland`, have a `coupon` and the total checkout
price must be greater than or equal to `120.00`.

```typescript
import { RulePilot, Rule } from "rulepilot";

// Define a rule which caters for your needs
const rule: Rule = {
  conditions: {
    all: [
      {
        field: "country",
        operator: "in",
        value: ["GB", "FI"],
      },
      {
        field: "hasCoupon",
        operator: "==",
        value: true,
      },
      {
        field: "totalCheckoutPrice",
        operator: ">=",
        value: 120.0,
      },
    ],
  },
};

// Define the criteria which will be evaluated against the rule
const criteria = {
  country: "GB",
  totalCheckoutPrice: 125.0,
  hasCoupon: true,
};

/**
 * Evaluate the criteria against the rule
 *
 * The result will be true
 */
let result = await RulePilot.evaluate(rule, criteria);

// However, if any of the criteria do not pass the check, the result will be false
criteria.totalCheckoutPrice = 25.0;

/**
 * The result will be false
 */
result = await RulePilot.evaluate(rule, criteria);
```

We can add additional requirements to the rule, for example apart from the above-mentioned conditions, we can also
require that the user is either `over 18` years old or `has a valid student card`.

Take note of how the `conditions` property is now an array of objects.

```typescript
import { RulePilot, Rule } from "rulepilot";

// Define a rule which caters for your needs
const rule: Rule = {
  conditions: [
    {
      all: [
        {
          field: "country",
          operator: "in",
          value: ["GB", "FI"],
        },
        {
          field: "hasCoupon",
          operator: "==",
          value: true,
        },
        {
          field: "totalCheckoutPrice",
          operator: ">=",
          value: 120.0,
        },
      ],
    },
    {
      any: [
        {
          field: "age",
          operator: ">=",
          value: 18,
        },
        {
          field: "hasStudentCard",
          operator: "==",
          value: true,
        },
      ],
    },
  ],
};

// Define the criteria which will be evaluated against the rule
const criteria = {
  country: "GB",
  totalCheckoutPrice: 20.0,
  hasCoupon: true,
};

/**
 * The result will be false
 */
let result = await RulePilot.evaluate(rule, criteria);

/**
 * The result will be true
 */
criteria.hasStudentCard = true;
result = await RulePilot.evaluate(rule, criteria);
```

If we want to add additional requirements to the rule, we can do so by adding another `any` or `all` condition.

For example, we can add a requirement that a discount will also be given to all users from Sweden as long as they are
18+ or have a valid student card _(irrelevant of any other conditions set)_.

```typescript
const rule: Rule = {
  conditions: [
    {
      any: [
        {
          all: [
            {
              field: "country",
              operator: "in",
              value: ["GB", "FI"],
            },
            {
              field: "hasCoupon",
              operator: "==",
              value: true,
            },
            {
              field: "totalCheckoutPrice",
              operator: ">=",
              value: 120.0,
            },
          ],
        },
        {
          field: "country",
          operator: "==",
          value: "SE",
        },
      ],
    },
    {
      any: [
        {
          field: "age",
          operator: ">=",
          value: 18,
        },
        {
          field: "hasStudentCard",
          operator: "==",
          value: true,
        },
      ],
    },
  ],
};
```

The criteria can be narrowed down further by specifying `Swedish` users cannot be from `Stockholm` or `Gothenburg`
otherwise they must spend `more than 200.00` at checkout.

```typescript
const rule: Rule = {
  conditions: [
    {
      any: [
        {
          all: [
            {
              field: "country",
              operator: "in",
              value: ["GB", "FI"],
            },
            {
              field: "hasCoupon",
              operator: "==",
              value: true,
            },
            {
              field: "totalCheckoutPrice",
              operator: ">=",
              value: 120.0,
            },
          ],
        },
        {
          any: [
            {
              all: [
                {
                  field: "country",
                  operator: "==",
                  value: "SE",
                },
                {
                  field: "city",
                  operator: "not in",
                  value: ["Stockholm", "Gothenburg"],
                },
              ],
            },
            {
              all: [
                {
                  field: "country",
                  operator: "==",
                  value: "SE",
                },
                {
                  field: "city",
                  operator: "totalCheckoutPrice",
                  value: 200.0,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      any: [
        {
          field: "age",
          operator: ">=",
          value: 18,
        },
        {
          field: "hasStudentCard",
          operator: "==",
          value: true,
        },
      ],
    },
  ],
};
```

### Granular Example

It might be the case that we want to give different discounts to people based on the criteria they meet. For example,
we want to give a 10% discount to all users who `18+` or have a `student card` and a 5% discount to the rest of the
users who meet the other criteria.

To accomplish this, we can assign a `result` to each condition which will be used to calculate the discount.

```typescript
const rule: Rule = {
  conditions: [
    {
      any: [
        {
          all: [
            {
              field: "country",
              operator: "in",
              value: ["GB", "FI"],
            },
            {
              field: "hasCoupon",
              operator: "==",
              value: true,
            },
            {
              field: "totalCheckoutPrice",
              operator: ">=",
              value: 120.0,
            },
          ],
        },
        {
          any: [
            {
              all: [
                {
                  field: "country",
                  operator: "==",
                  value: "SE",
                },
                {
                  field: "city",
                  operator: "not in",
                  value: ["Stockholm", "Gothenburg"],
                },
              ],
            },
            {
              all: [
                {
                  field: "country",
                  operator: "==",
                  value: "SE",
                },
                {
                  field: "city",
                  operator: "totalCheckoutPrice",
                  value: 200.0,
                },
              ],
            },
          ],
        },
      ],
      result: 5,
    },
    {
      any: [
        {
          field: "age",
          operator: ">=",
          value: 18,
        },
        {
          field: "hasStudentCard",
          operator: "==",
          value: true,
        },
      ],
      result: 10,
    },
  ],
};
```

In such a setup the result of our evaluation will be the value of the `result` property in condition which was met first.

```typescript
import { RulePilot } from "rulepilot";

// Define the criteria which will be evaluated against the rule
const criteria = {
  country: "GB",
  totalCheckoutPrice: 340.22,
  hasCoupon: true,
};

/**
 * The result will be 5
 */
let result = await RulePilot.evaluate(rule, criteria);

criteria.country = "SE";
criteria.city = "Linköping";

/**
 * The result will be 10
 */
result = await RulePilot.evaluate(rule, criteria);

criteria.country = "IT";
criteria.age = 17;
criteria.hasStudentCard = false;

/**
 * The result will be false
 */
result = await RulePilot.evaluate(rule, criteria);
```

**Important** When using granular rules, the order of conditions in the rule matters!

The first condition in the rule which is met will be the one which is used to calculate the discount.

#### Defaulting A Rule Result

In granular rules, it is possible to set a default value which will be used if no conditions are met.

```typescript
import { RulePilot, Rule } from "rulepilot";

const rule: Rule = {
  conditions: [
    {
      // ..
    },
  ],
  default: 2.5,
};

/**
 * The result will be 2.4
 */
let result = await RulePilot.evaluate(rule, {});
```

In such a setup as seen above, if no conditions are met, the result will be `2.5`.

#### Condition Types

There are three (3) types of conditions which can be used in a rule:

- `all` - All criteria in the condition must be met
- `any` - Any criteria in the condition must be met
- `none` - No criteria in the conditions must be met (none === !all)

Condition types can be mixed and matched or nested to create complex rules.

### Criteria With Nested Properties

In some cases, the criteria which is used to evaluate a rule might be more complex objects with nested properties.

For example, we might want to evaluate a rule against a `User` object which has a `profile` property which contains
the user's profile information.

To do so, we can use the `.` (dot) notation to access nested properties in the criteria.

```typescript
import { RulePilot, Rule } from "rulepilot";

const rule: Rule = {
  conditions: [
    {
      field: "profile.age",
      operator: ">=",
      value: 18,
    },
  ],
};

const criteria = {
  profile: {
    age: 20,
  },
};

/**
 * The result will be true
 */
let result = await RulePilot.evaluate(rule, criteria);
```

### Evaluating Multiple Criteria At Once

Multiple criteria can be evaluated against a rule at once by passing an array of criteria to the `evaluate()` method.

```typescript
import { RulePilot, Rule } from "rulepilot";

const rule: Rule = {
  conditions: {
    any: {
      field: "profile.age",
      operator: ">=",
      value: 18,
    },
  },
};

const criteria = [
  {
    profile: {
      age: 20,
    },
  },
  {
    profile: {
      age: 17,
    },
  },
];

/**
 * The result will be [true, false]
 */
let result = await RulePilot.evaluate(rule, criteria);
```

## Validating A Rule

of the rule to ensure it is valid and properly structured.

The `validate()` method will return `true` if the rule is valid, otherwise it will return an error message
describing the problem along with the problem node from the rule for easy debugging.

```typescript
import { RulePilot, Rule } from "rulepilot";

const rule: Rule = {
  // ...
};

const result = RulePilot.validate(rule);
```

For TypeScript users, the `ValidationResult` interface can be imported.

```typescript
import { RulePilot, Rule, ValidationResult } from "rulepilot";

const rule: Rule = {
  // ...
};

const validationResult: ValidationResult = RulePilot.validate(rule);
```

## Criteria Mutations

Mutations are a powerful tool built straight into `RulePilot` which allow for the modification of criteria before
evaluation.

Mutations can be basic functions which modify the criteria in some way, or they can be more complex functions which make 
API calls or perform other operations.

The mutation logic built into `RulePilot` is designed to be as efficient as possible, avoiding multiple repeat evaluations 
of by caching the results of previous evaluations.

Let's take a look at a simple example use case for mutations, where we uss an API call to fetch account information into
the criteria before evaluation.

```typescript
import { RulePilot, Rule } from "rulepilot";

// Example client method to fetch account information
import { fetchAccount } from './api'

const rule: Rule = {
  conditions: [{
    "all": [{
      field: "account.balance",
      operator: ">=",
      value: 100.00,
    },
    {
      field: "account.age",
      operator: ">=",
      value: 18,
    }],
  }],
};

const criteria = [{
  account: 123,
}, {
  account: 123,
}, {
  account: 124,
}];

// Instantiate a new RulePilot instance (recommended)
const rulePilot = new RulePilot();

// Add a mutation to fetch account information
// This mutation will be called once for each unique accountId in the criteria
rulePilot.addMutation("account", async (accountId, criteria) => {
  return await fetchAccount(accountId);
});

// Evaluate the rule
const result = await rulePilot.evaluate(rule, criteria);
```

In the example above, the `fetchAccount()` function will be called twice in parallel with (123, 124). All 3 criteria 
objects will be updated with the account information before the rule is evaluated.

### Important Notes About Mutations

- Mutations are only called once per unique criteria value
- Multiple mutations are called in parallel, not sequentially (for performance reasons)
- Mutations are cached by default, so if the same criteria value is encountered again, the mutation will not be called
- Mutations will copy the criteria object before mutating it, so the original criteria object will not be modified

**Note:** Mutations can be used with the static implementation of `RulePilot`, e.g. `RulePilot.addMutation(...)`, 
however it is not recommended to do so _(instead the instantiated implementation should be used)_, otherwise you risk 
having different parts of your application pushing different mutations for different rules to the same general pool.

**Note:** Mutation results are permanently cached for any given criteria value, so if you need to re-evaluate any rule
with the same criteria mutation while needing to re-process the mutation, you will need to clear the cache first.

```typescript
// Clear the cache for the account mutation
rulePilot.clearMutationCache("account");

// or ...

// Clear the entire mutation cache
rulePilot.clearMutationCache();
```

### Debugging Mutations

Mutations can be debugged by setting an environment variable `DEBUG="true"` when running `RulePilot`. This will 
cause mutations to log debug information to the console.

```typescript
process.env.DEBUG = "true";
```

## Fluent Rule Builder

Although creating rules in plain JSON is very straightforward, `RulePilot` comes with a `Builder` class which can be
used to create rules in a fluent manner.

The `add()` method allows for the addition of a root condition to the rule. This condition can be then setup as required.

The `default()` method allows for the addition of a default value result for the rule.

```typescript
import { RulePilot, Rule } from "rulepilot";

const b = RulePilot.builder();

const rule: Rule = b
  .add(
    b.condition(
      "all",
      [
        b.condition("any", [
          b.constraint("fieldA", "==", "bar"),
          b.constraint("fieldB", ">=", 2),
        ]),
        b.constraint("fieldC", "not in", [1, 2, 3]),
      ],
      3
    )
  )
  .add(b.condition("none", [], 5))
  .add(b.condition("any", [b.constraint("fieldA", "==", "value")]))
  .default(2)
  .build();
```

## Building The Library

The distribution can be built as follows, with the output being placed in a `dist` directory.

```bash
npm run build
```

```bash
yarn build
```

## Running Unit Tests

Tests are written in Jest and can be run with the following commands:

```bash
npm run jest --testPathPattern=test --detectOpenHandles --color --forceExit
```

```bash
yarn jest --testPathPattern=test --detectOpenHandles --color --forceExit
```
