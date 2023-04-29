# JSON Rule Engine

## Overview

| Statements | Functions | Lines |
| -----------|-----------|-------|
| ![Statements](https://img.shields.io/badge/Coverage-95.76%25-brightgreen.svg "Make me better!") | ![Functions](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg "Make me better!") | ![Lines](https://img.shields.io/badge/Coverage-95.72%25-brightgreen.svg "Make me better!") |

`json-rule-engine` is a fast and lightweight rule engine for JavaScript. It is designed to be simple to use and easy to
integrate into your application.

The rule engine evaluates human-readable JSON rules against a set of criteria. The rules are evaluated in a top-down
fashion. Rules can be written to evaluate to a `boolean` value or in a granular fashion, where each subset of the ruleset
can evaluate to a `boolean`, `number`, `string` or other value.


## Features

- Simple to use
- Written in TypeScript
- Runs both in Node and in the browser
- Lightweight andFast with no dependencies
- Granular rule evaluation
- Human-readable JSON rules
- Infinite nesting of rule conditions
- Supports `any`, `all`, and `none` type conditions
- Supports `Equal`, `NotEqual`, `GreaterThan`, `GreaterThanOrEqual`, `LessThan`, `LessThanOrEqual`, `In`, and `NotIn` operators
- Supports ruleset validation and debugging

## Usage

### Installation

```bash
npm install json-rule-engine
```

```bash
yarn add json-rule-engine
```

### Importing

```typescript
import { RuleEngine } from 'json-rule-engine';
```

For TypeScript users, you can import the `Rule` interface to get type definitions for the rule JSON.

```typescript
import { RuleEngine, Rule } from 'json-rule-engine';

const rule: Rule = {
    // ...
}
```

### Basic Example

Here we are defining a ruleset which will evaluate to `true` or `false` based on the criteria provided. In this example, 
we are checking whether a user is allowed to benefit from a discount at checkout of not.

For the discount to be applied, the user must be from either the `UK or Finland`, have a `coupon` and the total checkout 
price must be greater than or equal to `120.00`.

```typescript
import { RuleEngine } from 'json-rule-engine';

// Define a ruleset which caters for your needs
const rule = {
    "conditions": {
        "all": [
            {
                "field": "country",
                "operator": "in",
                "value": ["GB", "FI"]
            },
            {
                "field": "hasCoupon",
                "operator": "==",
                "value": true
            },
            {
                "field": "totalCheckoutPrice",
                "operator": ">=",
                "value": 120.00
            }
        ] 
    }
}

// Define the criteria which will be evaluated against the ruleset
const criteria = {
    country: "GB",
    totalCheckoutPrice: 340.22,
    hasCoupon: true,
}

/**
 * Evaluate the criteria against the ruleset
 * 
 * The result will be true
 */
let result = RuleEngine.evaluate(rule, criteria);

// However, if any of the criteria do not pass the check, the result will be false
criteria.totalCheckoutPrice = 25.50

/**
 * The result will be false
 */
result = RuleEngine.evaluate(rule, criteria);
```

We can add additional requirements to the ruleset, for example apart from the above-mentioned conditions, we can also 
require that the user is either `over 18` years old or `has a valid student card`.

Take note of how the `conditions` property is now an array of objects.

```typescript
import { RuleEngine } from 'json-rule-engine';

// Define a ruleset which caters for your needs
const rule = {
    "conditions": [
        {
            "all": [
                {
                    "field": "country",
                    "operator": "in",
                    "value": ["GB", "FI"]
                },
                {
                    "field": "hasCoupon",
                    "operator": "==",
                    "value": true
                },
                {
                    "field": "totalCheckoutPrice",
                    "operator": ">=",
                    "value": 120.00
                }
            ]
        },
        {
            "any": [
                {
                    "field": "age",
                    "operator": ">=",
                    "value": 18
                },
                {
                    "field": "hasStudentCard",
                    "operator": "==",
                    "value": true
                }
            ]
        }
    ]
}

// Define the criteria which will be evaluated against the ruleset
const criteria = {
    country: "GB",
    totalCheckoutPrice: 340.22,
    hasCoupon: true,
}

/**
 * The result will be false
 */
let result = RuleEngine.evaluate(rule, criteria);

/**
 * The result will be true
 */
criteria.hasStudentCard = true;
result = RuleEngine.evaluate(rule, criteria);
```

If we want to add additional requirements to the ruleset, we can do so by adding another `any` or `all` condition. 

For example, we can add a requirement that a discount will also be given to all users from Sweden as long as they are 
18+ or have a valid student card _(irrelevant of any other conditions set)_.

```typescript
const rule = {
    "conditions": [
        {
            "any": [
                {
                    "all": [{
                        "field": "country",
                        "operator": "in",
                        "value": ["GB", "FI"]
                    },
                    {
                        "field": "hasCoupon",
                        "operator": "==",
                        "value": true
                    },
                    {
                        "field": "totalCheckoutPrice",
                        "operator": ">=",
                        "value": 120.00
                    }
                ]
            },
            {
                "field": "country",
                "operator": "==",
                "value": "SE"
            }
        ]
    },
    {
        "any": [
            {
                "field": "age",
                "operator": ">=",
                "value": 18
            },
            {
                "field": "hasStudentCard",
                "operator": "==",
                "value": true
            }
        ]
    }
]}
```

The criteria can be narrowed down further by specifying `Swedish` users cannot be from `Stockholm` or `Gothenburg` 
otherwise they must spend `more than 200.00` at checkout.

```typescript
const rule = {
    "conditions": [{
        "any": [
            {
                "all": [
                    {
                        "field": "country",
                        "operator": "in",
                        "value": ["GB", "FI"]
                    },
                    {
                        "field": "hasCoupon",
                        "operator": "==",
                        "value": true
                    },
                    {
                        "field": "totalCheckoutPrice",
                        "operator": ">=",
                        "value": 120.00
                    }
                ]
            },
            {
                "any": [
                    {
                        "all": [
                            {
                                "field": "country",
                                "operator": "==",
                                "value": "SE"
                            },
                            {
                                "field": "city",
                                "operator": "not in",
                                "value": ["Stockholm", "Gothenburg"]
                            }
                        ]
                    },
                    {
                        "all": [
                            {
                                "field": "country",
                                "operator": "==",
                                "value": "SE"
                            },
                            {
                                "field": "city",
                                "operator": "totalCheckoutPrice",
                                "value": 200.00
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "any": [
            {
                "field": "age",
                "operator": ">=",
                "value": 18
            },
            {
                "field": "hasStudentCard",
                "operator": "==",
                "value": true
            }
        ]
    }
]}
```

### Granular Example

It might be the case that we want to give different discounts to people based on the criteria they meet. For example,
we want to give a 10% discount to all users who `18+` or have a `student card` and a 5% discount to the rest of the
users who meet the other criteria.

To accomplish this, we can assign a `result` to each condition which will be used to calculate the discount.

```typescript
const rule = {
    "conditions": [{
        "any": [
            {
                "all": [
                    {
                        "field": "country",
                        "operator": "in",
                        "value": ["GB", "FI"]
                    },
                    {
                        "field": "hasCoupon",
                        "operator": "==",
                        "value": true
                    },
                    {
                        "field": "totalCheckoutPrice",
                        "operator": ">=",
                        "value": 120.00
                    }
                ]
            },
            {
                "any": [
                    {
                        "all": [
                            {
                                "field": "country",
                                "operator": "==",
                                "value": "SE"
                            },
                            {
                                "field": "city",
                                "operator": "not in",
                                "value": ["Stockholm", "Gothenburg"]
                            }
                        ]
                    },
                    {
                        "all": [
                            {
                                "field": "country",
                                "operator": "==",
                                "value": "SE"
                            },
                            {
                                "field": "city",
                                "operator": "totalCheckoutPrice",
                                "value": 200.00
                            }
                        ]
                    }
                ]
            }
        ],
        "result": 5
    },
    {
        "any": [
            {
                "field": "age",
                "operator": ">=",
                "value": 18
            },
            {
                "field": "hasStudentCard",
                "operator": "==",
                "value": true
            }
        ],
        "result": 10
    }
]}
```

In such a setup the result of our evaluation will be the value of the `result` property in condition which was met first.

```typescript
import { RuleEngine } from 'json-rule-engine';

// Define the criteria which will be evaluated against the ruleset
const criteria = {
    country: "GB",
    totalCheckoutPrice: 340.22,
    hasCoupon: true,
}

/**
 * The result will be 5
 */
let result = RuleEngine.evaluate(rule, criteria);

criteria.country = "SE";
criteria.city = "Linköping";

/**
 * The result will be 10
 */
result = RuleEngine.evaluate(rule, criteria);

criteria.country = "IT";
criteria.age = 17;
criteria.hasStudentCard = false;

/**
 * The result will be false
 */
result = RuleEngine.evaluate(rule, criteria);
```

**Important** When using granular rules, the order of rules matters. The first rule which is met will be the one which 
is used to calculate the discount.

#### Setting Defaults

In granular rules, it is possible to set a default value which will be used if no conditions are met.

```typescript
import { RuleEngine } from 'json-rule-engine';

const rule = {
    "conditions": [{
        // ..
    }],
    "default": 2.4
};

/**
 * The result will be 2.4
 */
let result = RuleEngine.evaluate(rule, {});
```

In such a setup as seen above, if no conditions are met, the result will be `2.4`.


## Validating A Rule

of the rule to ensure it is valid and properly structured.

The `validate()` method will return `true` if the ruleset is valid, otherwise it will return an error message 
describing the problem along with the problem node from the rule for easy debugging.

```typescript
import { RuleEngine } from 'json-rule-engine';

const rule = {
    // ...
}

const result = RuleEngine.validate(rule);
```

For TypeScript users, the `ValidationResult` interface can be imported.

```typescript
import { RuleEngine, Rule, ValidationResult } from 'json-rule-engine';

const rule: Rule = {
    // ...
}

const validationResult: ValidationResult = RuleEngine.validate(rule);
```

## Building Distribution

```bash
yarn build
```

## Running Tests

```bash
yarn jest --testPathPattern=test --detectOpenHandles --color --forceExit
```