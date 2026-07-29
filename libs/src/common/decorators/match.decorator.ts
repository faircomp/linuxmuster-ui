/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

const MATCH_VALIDATOR_NAME = 'match';

const Match =
  (relatedPropertyName: string, validationOptions?: ValidationOptions) =>
  (object: object, propertyName: string): void => {
    registerDecorator({
      name: MATCH_VALIDATOR_NAME,
      target: object.constructor,
      propertyName,
      constraints: [relatedPropertyName],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedProperty] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[relatedProperty];
          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedProperty] = args.constraints as string[];
          return `${args.property} must match ${relatedProperty}`;
        },
      },
    });
  };

export default Match;
