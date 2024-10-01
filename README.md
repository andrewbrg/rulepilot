<img src=".github/logo.png" width="190" alt="RulePilot" />

[![npm version](https://badge.fury.io/js/rulepilot.svg)](https://badge.fury.io/js/rulepilot?v1.2.1)

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
- Sub-rules & infinitely nested conditions
- Dynamic criteria mutation
- Supports Criteria objects with nested properties
- Rule validation & debugging tools
- Supports `Any`, `All`, and `None` type conditions
- Supports `Equal`, `NotEqual`, `GreaterThan`, `GreaterThanOrEqual`, `LessThan`, `LessThanOrEqual`, `In`, `NotIn`, 
`Contains`, `Not Contains`, `ContainsAny`, `Not ContainsAny`, `Matches` and `Not Matches` operators

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
      { field: "country", operator: "in", value: ["GB", "FI"] },
      { field: "hasCoupon", operator: "==", value: true },
      { field: "totalCheckoutPrice", operator: ">=", value: 120.0 },
    ],
  },
};

// Define the criteria which will be evaluated against the rule
const criteria = {
  country: "GB",
  totalCheckoutPrice: 125.0,
  hasCoupon: true,
};

/** Evaluate the criteria against the rule */
let result = await RulePilot.evaluate<boolean>(rule, criteria);
// result == true

// However, if any of the criteria do not pass the check, the result will be false
criteria.totalCheckoutPrice = 25.0;

/** Evaluate the new criteria against the rule */
result = await RulePilot.evaluate<boolean>(rule, criteria); // result == false
```

We can add additional conditions to the rule, for example apart from the above-mentioned conditions, we can also
say that if the user is either `over 18` years old or `has a valid student card` then we will evaluate to true.

Take note of how the `conditions` property is now an array of objects.

```typescript
import { RulePilot, Rule } from "rulepilot";

// Define a rule which caters for your needs
const rule: Rule = {
  conditions: [
    {
      all: [
        { field: "country", operator: "in", value: ["GB", "FI"] },
        { field: "hasCoupon", operator: "==", value: true },
        { field: "totalCheckoutPrice", operator: ">=", value: 120.0 },
      ],
    },
    {
      any: [
        { field: "age", operator: ">=",  value: 18 },
        { field: "hasStudentCard", operator: "==", value: true },
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

/** Evaluate the criteria against the rule */
let result = await RulePilot.evaluate<boolean>(rule, criteria); // result == false

criteria.hasStudentCard = true;

/** Evaluate the new criteria against the rule */
result = await RulePilot.evaluate<boolean>(rule, criteria); // result == true
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
            { field: "country", operator: "in", value: ["GB", "FI"] },
            { field: "hasCoupon", operator: "==", value: true },
            { field: "totalCheckoutPrice", operator: ">=", value: 120.0 },
          ],
        },
        { field: "country",  operator: "==", value: "SE" },
      ],
    },
    {
      any: [
        { field: "age", operator: ">=",  value: 18 },
        { field: "hasStudentCard", operator: "==", value: true },
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
            { field: "country", operator: "in", value: ["GB", "FI"] },
            { field: "hasCoupon", operator: "==", value: true },
            { field: "totalCheckoutPrice", operator: ">=", value: 120.0 },
          ],
        },
        {
          any: [
            {
              all: [
                { field: "country", operator: "==", value: "SE" },
                { field: "city", operator: "not in", value: ["Stockholm", "Gothenburg"] },
              ],
            },
            {
              all: [
                { field: "country",  operator: "==", value: "SE" },
                { field: "city", operator: "totalCheckoutPrice",  value: 200 },
              ],
            },
          ],
        },
      ],
    },
    {
      any: [
        { field: "age", operator: ">=",  value: 18 },
        { field: "hasStudentCard", operator: "==", value: true },
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
            { field: "country", operator: "in", value: ["GB", "FI"] },
            { field: "hasCoupon", operator: "==", value: true },
            { field: "totalCheckoutPrice", operator: ">=", value: 120.0 },
          ],
        },
        {
          any: [
            {
              all: [
                { field: "country", operator: "==", value: "SE" },
                { field: "city", operator: "not in", value: ["Stockholm", "Gothenburg"] },
              ],
            },
            {
              all: [
                { field: "country",  operator: "==", value: "SE" },
                { field: "city", operator: "totalCheckoutPrice",  value: 200 },
              ],
            },
          ],
        },
      ],
      result: 5,
    },
    {
      any: [
        { field: "age", operator: ">=",  value: 18 },
        { field: "hasStudentCard", operator: "==", value: true },
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

/** Evaluate the criteria against the rule */
let result = await RulePilot.evaluate<number>(rule, criteria); // result = 5

criteria.country = "SE";
criteria.city = "Linköping";

/** Evaluate the new criteria against the rule */
result = await RulePilot.evaluate<number>(rule, criteria); // result = 10

criteria.country = "IT";
criteria.age = 17;
criteria.hasStudentCard = false;

/** Evaluate the new criteria against the rule */
result = await RulePilot.evaluate<number>(rule, criteria); // result = false
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


/** Evaluate the criteria against the rule */
let result = await RulePilot.evaluate<number>(rule, {}); // result = 2.5
```

In such a setup as seen above, if no conditions are met, the result will be `2.5`.

#### Condition Types

There are three (3) types of conditions which can be used in a rule:

- `all` - All criteria in the condition must be met
- `any` - Any criteria in the condition must be met
- `none` - No criteria in the conditions must be met (none === !all)

Condition types can be mixed and matched or nested to create complex rules.

#### Operators

These are the operators available for a constraint and how they are used:

- `==`: Applies JavaScript equality (`==`) operator to criterion and constraint value
- `!=`: Applies JavaScript inequality (`!=`) operator to criterion and constraint value
- `>`: Applies JavaScript greater than (`>`) operator to criterion and constraint value
- `<`: Applies JavaScript less than (`<`) operator to criterion and constraint value
- `>=`: Applies JavaScript greater than or equal (`>=`) operator to criterion and constraint value
- `<=`: Applies JavaScript less than or equal (`<=`) operator to criterion and constraint value
- `in`: Tests if the criterion is an element of the constraint value (value must be an array)
- `not in`: Tests if the criterion is not an element of the constraint value (value must be an array)
- `contains`: Tests if the constraint value is an element of the criterion (criterion must be an array)
- `contains any`: Tests if any element in the constraint value is an element of the criterion (criterion and constraint value must be an array)
- `not contains`: Tests if the constraint value is not an element of the criterion (criterion must be an array)
- `not contains any`: Tests if any element in the constraint value is bot an element of the criterion (criterion and constraint value must be an array)
- `matches`: Tests if the constraint value matches a regular expression (criterion must be a valid regex)
- `not matches`: Tests if the constraint value does not match a regular expression (criterion must be a valid regex)

### Criteria With Nested Properties

In some cases, the criteria which is used to evaluate a rule might be more complex objects with nested properties.

For example, we might want to evaluate a rule against a `User` object which has a `profile` property which contains
the user's profile information.

To do so, we can use the `.` (dot) notation to access nested properties in the criteria.

```typescript
import { RulePilot, Rule } from "rulepilot";

const rule: Rule = {
  conditions: {
    all: [{ field: "profile.age",  operator: ">=", value: 18 }],
  },
};

const criteria = {
  profile: { age: 20 },
};

/** Evaluate the criteria against the rule */
let result = await RulePilot.evaluate(rule, criteria); // result = true
```

### Evaluating Multiple Criteria At Once

Multiple criteria can be evaluated against a rule at once by passing an array of criteria to the `evaluate()` method.

```typescript
import { RulePilot, Rule } from "rulepilot";

const rule: Rule = {
  conditions: {
    all: [{ field: "profile.age",  operator: ">=", value: 18 }],
  },
};

const criteria = [
  { profile: { age: 20 } },
  { profile: { age: 17 } },
];

/** Evaluate the criteria against the rule */
let result = await RulePilot.evaluate(rule, criteria); // result = [true, false]
```

### Sub Rules

Sub-rules can be used to create early exit points rules by assigning a `rule` property to a condition. This rule property
will contain a new rule in itself which will be evaluated if the constraints of the host condition are met.

Sub-rules do not need to evaluate to true for their parent condition to pass evaluation. They contain their own result 
which will be returned if the following conditions are met:

- The parent condition (all criteria and/or nested rules) are met
- The sub-rule is met

They provide a convenient way to create complex rules with early exit points and avoid repeating the same constraints 
in multiple places. 

An example of a sub-rule can be seen below:

```typescript
import { RulePilot, Rule } from "rulepilot";

const rule: Rule = {
  conditions: {
    any: [
      { field: "profile.age", operator: ">=",  value: 18 },
      {
        rule: {
          conditions: { all: [{ field: "foo", operator: "==", value: 'A' }] },
          result: 10
        }
      },
      {
        rule: {
          conditions: { all: [{ field: "foo", operator: "==", value: 'B' }] },
          result: 20
        },
      }
    ],
    result: 5
  }
};

let criteria = { profile: { age: 20 } }
let result = await RulePilot.evaluate(rule, criteria); // result = 5

criteria = { profile: { age: 20 }, foo: 'A' };
result = await RulePilot.evaluate(rule, criteria); // result = 10

criteria = { profile: { age: 20 }, foo: 'B' };
result = await RulePilot.evaluate(rule, criteria); // result = 20

criteria = { profile: { age: 20 }, foo: 'C' };
result = await RulePilot.evaluate(rule, criteria); // result = 5

criteria = { profile: { age: 10 }, foo: 'A' };
result = await RulePilot.evaluate(rule, criteria); // result = false
```


## Validating A Rule

Validation can be performed on a rule to ensure it is valid and properly structured.

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

The mutation logic built into `RulePilot` is designed to be as efficient as possible, avoiding multiple repeat 
evaluations by caching the results of previous evaluations. The mutator logic also identifies all unique mutations 
required at runtime and executes them all in parallel before passing the criteria to the rule engine for evaluation.

Let's take a look at a simple example use case for mutations, where we use an API call to fetch account information into
the criteria before evaluation.

```typescript
import { RulePilot, Rule } from "rulepilot";

// Example client method to fetch account information
import { fetchAccount } from './api'

const rule: Rule = {
  conditions: [{
    all: [
      { field: "account.balance", operator: ">=", value: 100.00 },
      { field: "account.age", operator: ">=", value: 18 }
    ],
  }],
};

const criteria = [{ account: 123 }, { account: 123 }, { account: 124 }];

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

## Introspection

Rule introspection is built into `RulePilot` and can be used to inspect a rule and get information about it.

when `RulePilot` introspects a rule it attempts to determine, for each distinct result set in the rule, the 
distribution of inputs which will satisfy the rule in a manner which evaluates to said result.

What this means is that given any rule, the introspection feature will return all the possible input combinations 
which the rule can be evaluated against which will result in all the possible outputs the rule can have.

This is a useful feature when you want to know what inputs will result in a specific output, or what inputs will result
in a specific output distribution.

For example if a `RulePilot` rule is being used to evaluate what type of discount a user should get, you can use 
the introspection feature to tell the user what products, quantities, requirements, etc. they must fulfill in 
order to obtain each possible discount. 

This is particularly useful when using some form of rule based configuration to drive the UI of an application.

Taking a simple granular rule as an example:

```typescript
import { RulePilot, Rule } from "rulepilot";

const rule: Rule = {
  conditions: [
    {
      any: [
        {
          all: [
            { field: "country", operator: "in", value: ["GB", "FI"] },
            { field: "hasCoupon", operator: "==", value: true },
            { field: "totalCheckoutPrice", operator: ">=", value: 120.0 },
          ],
        },
        { field: "country", operator: "==", value: "SE" },
      ],
      result: 5,
    },
    {
      all: [
        { field: "age", operator: ">=", value: 18 },
        { field: "hasStudentCard", operator: "==", value: true },
      ],
      result: 10,
    },
  ],
};

// Intropect the rule
const introspection = RulePilot.introspect(rule);
```

The following will be returned in the `introspection` variable:

```json
{
  "results": [
    {
      "result": 5,
      "options": [
        { "country": "SE" },
        { "country": ["GB", "FI"], "hasCoupon": true, "totalCheckoutPrice": { "operator": ">=", "value": 120 } }
      ]
    },
    {
      "result": 10,
      "options": [
        { "age": { "operator": ">=", "value": 18 }, "hasStudentCard": true }
      ]
    }
  ]
}
```

Each possible result that the rule can evaluate to is returned in the `results` array, along with the possible inputs
which will result in that result in the `options` array.

Each object in the `options` array is a set of criteria which must be met in order for the rule to evaluate to the 
result, we can consider the list of objects in the `options` as an `OR` and the criteria inside each object as 
an `AND`.

Although calculating such results might seem trivial, it can be in fact be quite a complex thing to do especially when 
dealing with complex rules with multiple nested conditions comprised of many different operators.

Similarly to mutations, it is possible to enable debug mode on the introspection feature by setting the environment
variable `DEBUG="true"`.

```typescript
process.env.DEBUG = "true";
```

**Note:** Introspection requires a [Granular](#granular-example) rule to be passed to it, otherwise `RulePilot` will 
throw an `RuleTypeError`.


## Fluent Rule Builder

Although creating rules in plain JSON is very straightforward, `RulePilot` comes with a `Builder` class which can be
used to create rules in a fluent manner.

The `add()` method allows for the addition of a root condition to the rule. This condition can be then setup as required.

The `default()` method allows for the addition of a default value result for the rule.

```typescript
import { RulePilot, Rule } from "rulepilot";

const builder = RulePilot.builder();

const rule: Rule = builder
  .add(
    builder.condition(
      "all",
      [
        builder.condition("any", [
          builder.constraint("size", "==", "medium"),
          builder.constraint("weight", ">=", 2),
        ]),
        builder.constraint("category", "not in", ["free", "out of stock"]),
      ],
      { price: 20 }
    )
  )
  .add(
    builder.condition(
      "any",
      [
        builder.constraint("size", "==", "small"),
        builder.constraint("weight", "<", "2"),
      ],
      { price: 10 }
    )
  )
  .default({ price: 5 })
  .build();
```

### Adding Sub Rules in the builder

```typescript
import { RulePilot, Rule } from "rulepilot";

const builder = RulePilot.builder();

const subRule = builder.subRule();
subRule.add(
  subRule.condition(
    "all",
    [
      subRule.constraint("color", "==", "green"),
      subRule.constraint("discount", ">", 20),
    ], 
    { price: 10 }
  )
);

const rule: Rule = builder
  .add(
    builder.condition(
      "all",
      [
        builder.condition("any", [
          builder.constraint("size", "==", "medium"),
          builder.constraint("weight", ">=", 2),
        ]),
        builder.constraint("category", "not in", ["free", "out of stock"]),
      ],
      { price: 20 },
      subRule
    )
  )
  .add(
    builder.condition(
      "any",
      [
        builder.constraint("size", "==", "small"),
        builder.constraint("weight", "<", "2"),
      ],
      { price: 10 }
    )
  )
  .default({ price: 5 })
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
npm run jest --testPathPattern=test --color --forceExit --silent
```

```bash
yarn jest --testPathPattern=test --color --forceExit --silent
```
