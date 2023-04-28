# JSON Rule Engine

## Overview

`json-rule-engine` is a fast and lightweight rule engine for JavaScript. It is designed to be simple to use and easy to 
integrate into your application.

The rule engine evaluates human-readable JSON rules against a set of criteria. The rules are evaluated in a top-down 
fashion. Rules can be written to evaluate to a `boolean` value or in a granular fashion, where each subset of the ruleset
can evaluate to a `boolean`, `number`, `string` or other value.

## Features

- Simple to use
- Lightweight
- Runs both in Node.js and in the browser
- Fast with no dependencies
- Granular rule evaluation
- Human-readable JSON rules
- Infinite nesting of rule sets
- Supports `any`, `all` and `none` type conditions
- Supports `Equal`, `NotEqual`, `GreaterThan`, `GreaterThanOrEqual`, `LessThan`, `LessThanOrEqual`, `In`, and `NotIn` operators
- Supports ruleset validation and debugging

## Usage

### Basic example

Here we are defining a ruleset which will evaluate to `true` or `false` based on the criteria provided. In this example, 
we are checking whether a user is allowed to benefit from a discount at checkout of not.

For the discount to be applied, the user must be from either the `UK or Finland`, have a `coupon` and the total checkout 
price must be greater than or equal to `120.00`.

```javascript
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
const result = RuleEngine.evaluate(rule, criteria);

// However, if any of the criteria do not pass the check, the result will be false
criteria.totalCheckoutPrice = 25.50

/**
 * The result will be false
 */
const result = RuleEngine.evaluate(rule, criteria);
```

We can add additional requirements to the ruleset, for example apart from the above-mentioned conditions, we can also 
require that the user is either `over 18` years old or `has a valid student card`.

Take note of how the `conditions` property is now an array of objects.

```javascript

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
const result = RuleEngine.evaluate(rule, criteria);

/**
 * The result will be true
 */
criteria.hasStudentCard = true;
const result = RuleEngine.evaluate(rule, criteria);
```

If we want to add additional requirements to the ruleset, we can do so by adding another `any` or `all` condition. 

For example, we can add a requirement that a discount will also be given to all users from Sweden as long as they are 
18+ or have a valid student card _(irrelevant of any other conditions set)_.

```javascript
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

```javascript
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

### Granular example

It might be the case that we want to give different discounts to people based on the criteria they meet. For example,
we want to give a 10% discount to all users who `18+` or have a `student card` and a 5% discount to the rest of the
users who meet the other criteria.

To accomplish this, we can assign a `result` to each condition which will be used to calculate the discount.

```javascript
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

In such a setup the result of our evaluation will be the value of the condition which was met first. 


```javascript
// Define the criteria which will be evaluated against the ruleset
const criteria = {
    country: "GB",
    totalCheckoutPrice: 340.22,
    hasCoupon: true,
}

/**
 * The result will be 5
 */
const result = RuleEngine.evaluate(rule, criteria);

criteria.country = "SE";
criteria.city = "Linköping";

/**
 * The result will be 10
 */
const result = RuleEngine.evaluate(rule, criteria);

criteria.country = "IT";
criteria.age = 17;
criteria.hasStudentCard = false;

/**
 * The result will be false
 */
const result = RuleEngine.evaluate(rule, criteria);
```

## Validating A Ruleset

The ruleset can be validated by using the `RuleEngine.validate()` method.

This method will return `true` if the ruleset is valid, otherwise it will return an error message describing the problem 
along with the problem node from the ruleset for easy debugging.


## Running Tests

```bash
yarn jest --testPathPattern=test --detectOpenHandles --color --forceExit
```