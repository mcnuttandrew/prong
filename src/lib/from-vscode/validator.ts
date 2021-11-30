// forked from
// https:github.com/microsoft/vscode-json-languageservice/blob/386122c7f0b6dfab488b3cadaf135188bf367e0f/src/parser/jsonParser.ts
import * as nls from "vscode-nls";
import { JSONSchema, JSONSchemaRef } from "../JSONSchemaTypes";
// import $RefParser from "@apidevtools/json-schema-ref-parser";
import {
  ASTNode,
  parse,
  NumberASTNode,
  StringASTNode,
  ArrayASTNode,
  ObjectASTNode,
  PropertyASTNode,
} from "./parser";
import { resolveSchemaContent } from "./resolve-schema";
import {
  asSchema,
  contains,
  getNodeValue,
  equals,
  isDefined,
  isNumber,
  isBoolean,
  isString,
  ErrorCode,
} from "./utils";

let localize = nls.loadMessageBundle();

export function getMatchingSchemas(
  schema: JSONSchema,
  code: string
): Promise<IApplicableSchema[]> {
  // todo the vscode version does some stuff with filteirng for invert?
  // watch out for that as a bug
  return resolveSchemaContent(schema, "./", new Set()).then(
    (resolvedSchema: any) => {
      const parseTree = parse(code)!;
      const matchingSchemas = new SchemaCollector(-1);
      validate(
        parseTree.root,
        resolvedSchema.schema,
        new ValidationResult(),
        matchingSchemas
      );
      return matchingSchemas.schemas;
    }
  );
}

export interface MatchingSchema {
  node: ASTNode;
  schema: JSONSchema;
}

export interface IRange {
  offset: number;
  length: number;
}
export type Severity = "Error" | "Warning" | "None";
interface IProblem {
  location: IRange;
  severity?: Severity;
  code?: ErrorCode;
  message: string;
}

const formats = {
  "color-hex": {
    errorMessage: localize(
      "colorHexFormatWarning",
      "Invalid color format. Use #RGB, #RGBA, #RRGGBB or #RRGGBBAA."
    ),
    pattern: /^#([0-9A-Fa-f]{3,4}|([0-9A-Fa-f]{2}){3,4})$/,
  },
  "date-time": {
    errorMessage: localize(
      "dateTimeFormatWarning",
      "String is not a RFC3339 date-time."
    ),
    pattern:
      /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)([01][0-9]|2[0-3]):([0-5][0-9]))$/i,
  },
  date: {
    errorMessage: localize(
      "dateFormatWarning",
      "String is not a RFC3339 date."
    ),
    pattern: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/i,
  },
  time: {
    errorMessage: localize(
      "timeFormatWarning",
      "String is not a RFC3339 time."
    ),
    pattern:
      /^([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)([01][0-9]|2[0-3]):([0-5][0-9]))$/i,
  },
  email: {
    errorMessage: localize(
      "emailFormatWarning",
      "String is not an e-mail address."
    ),
    pattern:
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  },
};

interface IApplicableSchema {
  node: ASTNode;
  inverted?: boolean;
  schema: JSONSchema;
}

interface ISchemaCollector {
  schemas: IApplicableSchema[];
  add(schema: IApplicableSchema): void;
  merge(other: ISchemaCollector): void;
  include(node: ASTNode): boolean;
  newSub(): ISchemaCollector;
}

class SchemaCollector implements ISchemaCollector {
  schemas: IApplicableSchema[] = [];
  constructor(private focusOffset = -1, private exclude?: ASTNode) {}
  add(schema: IApplicableSchema) {
    this.schemas.push(schema);
  }
  merge(other: ISchemaCollector) {
    Array.prototype.push.apply(this.schemas, other.schemas);
  }
  include(node: ASTNode) {
    return (
      (this.focusOffset === -1 || contains(node, this.focusOffset)) &&
      node !== this.exclude
    );
  }
  newSub(): ISchemaCollector {
    return new SchemaCollector(-1, this.exclude);
  }
}

class NoOpSchemaCollector implements ISchemaCollector {
  private constructor() {}
  get schemas() {
    return [];
  }
  add(schema: IApplicableSchema) {}
  merge(other: ISchemaCollector) {}
  include(node: ASTNode) {
    return true;
  }
  newSub(): ISchemaCollector {
    return this;
  }

  static instance = new NoOpSchemaCollector();
}

class ValidationResult {
  public problems: IProblem[];

  public propertiesMatches: number;
  public propertiesValueMatches: number;
  public primaryValueMatches: number;
  public enumValueMatch: boolean;
  public enumValues: any[] | undefined;

  constructor() {
    this.problems = [];
    this.propertiesMatches = 0;
    this.propertiesValueMatches = 0;
    this.primaryValueMatches = 0;
    this.enumValueMatch = false;
    this.enumValues = undefined;
  }

  public hasProblems(): boolean {
    return !!this.problems.length;
  }

  public mergeAll(validationResults: ValidationResult[]): void {
    for (const validationResult of validationResults) {
      this.merge(validationResult);
    }
  }

  public merge(validationResult: ValidationResult): void {
    this.problems = this.problems.concat(validationResult.problems);
  }

  public mergeEnumValues(validationResult: ValidationResult): void {
    if (
      !this.enumValueMatch &&
      !validationResult.enumValueMatch &&
      this.enumValues &&
      validationResult.enumValues
    ) {
      this.enumValues = this.enumValues.concat(validationResult.enumValues);
      for (const error of this.problems) {
        if (error.code === ErrorCode.EnumValueMismatch) {
          error.message = localize(
            "enumWarning",
            "Value is not accepted. Valid values: {0}.",
            this.enumValues.map((v) => JSON.stringify(v)).join(", ")
          );
        }
      }
    }
  }

  public mergePropertyMatch(propertyValidationResult: ValidationResult): void {
    this.merge(propertyValidationResult);
    this.propertiesMatches++;
    if (
      propertyValidationResult.enumValueMatch ||
      (!propertyValidationResult.hasProblems() &&
        propertyValidationResult.propertiesMatches)
    ) {
      this.propertiesValueMatches++;
    }
    if (
      propertyValidationResult.enumValueMatch &&
      propertyValidationResult.enumValues &&
      propertyValidationResult.enumValues.length === 1
    ) {
      this.primaryValueMatches++;
    }
  }

  public compare(other: ValidationResult): number {
    const hasProblems = this.hasProblems();
    if (hasProblems !== other.hasProblems()) {
      return hasProblems ? -1 : 1;
    }
    if (this.enumValueMatch !== other.enumValueMatch) {
      return other.enumValueMatch ? -1 : 1;
    }
    if (this.primaryValueMatches !== other.primaryValueMatches) {
      return this.primaryValueMatches - other.primaryValueMatches;
    }
    if (this.propertiesValueMatches !== other.propertiesValueMatches) {
      return this.propertiesValueMatches - other.propertiesValueMatches;
    }
    return this.propertiesMatches - other.propertiesMatches;
  }
}

export function validate(
  n: ASTNode | undefined,
  schema: JSONSchema,
  validationResult: ValidationResult,
  matchingSchemas: ISchemaCollector
): void {
  if (!n || !matchingSchemas.include(n)) {
    return;
  }
  const node = n;
  switch (node.type) {
    case "object":
      _validateObjectNode(node, schema, validationResult, matchingSchemas);
      break;
    case "array":
      _validateArrayNode(node, schema, validationResult, matchingSchemas);
      break;
    case "string":
      _validateStringNode(node, schema, validationResult, matchingSchemas);
      break;
    case "number":
      _validateNumberNode(node, schema, validationResult, matchingSchemas);
      break;
    case "property":
      return validate(
        node.valueNode,
        schema,
        validationResult,
        matchingSchemas
      );
  }
  _validateNode();
  matchingSchemas.add({ node: node, schema: schema });

  function _validateNode() {
    function matchesType(type: string) {
      return (
        node.type === type ||
        (type === "integer" && node.type === "number" && node.isInteger)
      );
    }

    if (Array.isArray(schema.type)) {
      if (!schema.type.some(matchesType)) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message:
            schema.errorMessage ||
            localize(
              "typeArrayMismatchWarning",
              "Incorrect type. Expected one of {0}.",
              (<string[]>schema.type).join(", ")
            ),
        });
      }
    } else if (schema.type) {
      if (!matchesType(schema.type)) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message:
            schema.errorMessage ||
            localize(
              "typeMismatchWarning",
              'Incorrect type. Expected "{0}".',
              schema.type
            ),
        });
      }
    }
    if (Array.isArray(schema.allOf)) {
      for (const subSchemaRef of schema.allOf) {
        validate(
          node,
          asSchema(subSchemaRef)!,
          validationResult,
          matchingSchemas
        );
      }
    }
    const notSchema = asSchema(schema.not);
    if (notSchema) {
      const subValidationResult = new ValidationResult();
      const subMatchingSchemas = matchingSchemas.newSub();
      validate(node, notSchema, subValidationResult, subMatchingSchemas);
      if (!subValidationResult.hasProblems()) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message: localize(
            "notSchemaWarning",
            "Matches a schema that is not allowed."
          ),
        });
      }
      for (const ms of subMatchingSchemas.schemas) {
        ms.inverted = !ms.inverted;
        matchingSchemas.add(ms);
      }
    }

    const testAlternatives = (
      alternatives: JSONSchemaRef[],
      maxOneMatch: boolean
    ) => {
      const matches = [];

      // remember the best match that is used for error messages
      let bestMatch:
        | {
            schema: JSONSchema;
            validationResult: ValidationResult;
            matchingSchemas: ISchemaCollector;
          }
        | undefined = undefined;
      for (const subSchemaRef of alternatives) {
        const subSchema = asSchema(subSchemaRef);
        const subValidationResult = new ValidationResult();
        const subMatchingSchemas = matchingSchemas.newSub();
        validate(node, subSchema!, subValidationResult, subMatchingSchemas);
        if (!subValidationResult.hasProblems()) {
          matches.push(subSchema);
        }
        if (!bestMatch) {
          bestMatch = {
            schema: subSchema!,
            validationResult: subValidationResult,
            matchingSchemas: subMatchingSchemas,
          };
        } else {
          if (
            !maxOneMatch &&
            !subValidationResult.hasProblems() &&
            !bestMatch.validationResult.hasProblems()
          ) {
            // no errors, both are equally good matches
            bestMatch.matchingSchemas.merge(subMatchingSchemas);
            bestMatch.validationResult.propertiesMatches +=
              subValidationResult.propertiesMatches;
            bestMatch.validationResult.propertiesValueMatches +=
              subValidationResult.propertiesValueMatches;
          } else {
            const compareResult = subValidationResult.compare(
              bestMatch.validationResult
            );
            if (compareResult > 0) {
              // our node is the best matching so far
              bestMatch = {
                schema: subSchema!,
                validationResult: subValidationResult,
                matchingSchemas: subMatchingSchemas,
              };
            } else if (compareResult === 0) {
              // there's already a best matching but we are as good
              bestMatch.matchingSchemas.merge(subMatchingSchemas);
              bestMatch.validationResult.mergeEnumValues(subValidationResult);
            }
          }
        }
      }

      if (matches.length > 1 && maxOneMatch) {
        validationResult.problems.push({
          location: { offset: node.offset, length: 1 },
          message: localize(
            "oneOfWarning",
            "Matches multiple schemas when only one must validate."
          ),
        });
      }
      if (bestMatch) {
        validationResult.merge(bestMatch.validationResult);
        validationResult.propertiesMatches +=
          bestMatch.validationResult.propertiesMatches;
        validationResult.propertiesValueMatches +=
          bestMatch.validationResult.propertiesValueMatches;
        matchingSchemas.merge(bestMatch.matchingSchemas);
      }
      return matches.length;
    };
    if (Array.isArray(schema.anyOf)) {
      testAlternatives(schema.anyOf, false);
    }
    if (Array.isArray(schema.oneOf)) {
      testAlternatives(schema.oneOf, true);
    }

    const testBranch = (schema: JSONSchemaRef) => {
      const subValidationResult = new ValidationResult();
      const subMatchingSchemas = matchingSchemas.newSub();

      validate(
        node,
        asSchema(schema)!,
        subValidationResult,
        subMatchingSchemas
      );

      validationResult.merge(subValidationResult);
      validationResult.propertiesMatches +=
        subValidationResult.propertiesMatches;
      validationResult.propertiesValueMatches +=
        subValidationResult.propertiesValueMatches;
      matchingSchemas.merge(subMatchingSchemas);
    };

    const testCondition = (
      ifSchema: JSONSchemaRef,
      thenSchema?: JSONSchemaRef,
      elseSchema?: JSONSchemaRef
    ) => {
      const subSchema = asSchema(ifSchema);
      const subValidationResult = new ValidationResult();
      const subMatchingSchemas = matchingSchemas.newSub();

      validate(node, subSchema!, subValidationResult, subMatchingSchemas);
      matchingSchemas.merge(subMatchingSchemas);

      if (!subValidationResult.hasProblems()) {
        if (thenSchema) {
          testBranch(thenSchema);
        }
      } else if (elseSchema) {
        testBranch(elseSchema);
      }
    };

    const ifSchema = asSchema(schema.if);
    if (ifSchema) {
      testCondition(ifSchema, asSchema(schema.then), asSchema(schema.else));
    }

    if (Array.isArray(schema.enum)) {
      const val = getNodeValue(node);
      let enumValueMatch = false;
      for (const e of schema.enum) {
        if (equals(val, e)) {
          enumValueMatch = true;
          break;
        }
      }
      validationResult.enumValues = schema.enum;
      validationResult.enumValueMatch = enumValueMatch;
      if (!enumValueMatch) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          code: ErrorCode.EnumValueMismatch,
          message:
            schema.errorMessage ||
            localize(
              "enumWarning",
              "Value is not accepted. Valid values: {0}.",
              schema.enum.map((v) => JSON.stringify(v)).join(", ")
            ),
        });
      }
    }

    if (isDefined(schema.const)) {
      const val = getNodeValue(node);
      if (!equals(val, schema.const)) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          code: ErrorCode.EnumValueMismatch,
          message:
            schema.errorMessage ||
            localize(
              "constWarning",
              "Value must be {0}.",
              JSON.stringify(schema.const)
            ),
        });
        validationResult.enumValueMatch = false;
      } else {
        validationResult.enumValueMatch = true;
      }
      validationResult.enumValues = [schema.const];
    }

    if (schema.deprecationMessage && node.parent) {
      validationResult.problems.push({
        location: { offset: node.parent.offset, length: node.parent.length },
        // severity: DiagnosticSeverity.Warning,
        severity: "Warning",
        message: schema.deprecationMessage,
        code: ErrorCode.Deprecated,
      });
    }
  }

  function _validateNumberNode(
    node: NumberASTNode,
    schema: JSONSchema,
    validationResult: ValidationResult,
    matchingSchemas: ISchemaCollector
  ): void {
    const val = node.value;

    function normalizeFloats(
      float: number
    ): { value: number; multiplier: number } | null {
      const parts = /^(-?\d+)(?:\.(\d+))?(?:e([-+]\d+))?$/.exec(
        float.toString()
      );
      return (
        parts && {
          value: Number(parts[1] + (parts[2] || "")),
          multiplier: (parts[2]?.length || 0) - (parseInt(parts[3]) || 0),
        }
      );
    }
    if (isNumber(schema.multipleOf)) {
      let remainder: number = -1;
      if (Number.isInteger(schema.multipleOf)) {
        remainder = val % schema.multipleOf;
      } else {
        let normMultipleOf = normalizeFloats(schema.multipleOf);
        let normValue = normalizeFloats(val);
        if (normMultipleOf && normValue) {
          const multiplier =
            10 ** Math.abs(normValue.multiplier - normMultipleOf.multiplier);
          if (normValue.multiplier < normMultipleOf.multiplier) {
            normValue.value *= multiplier;
          } else {
            normMultipleOf.value *= multiplier;
          }
          remainder = normValue.value % normMultipleOf.value;
        }
      }
      if (remainder !== 0) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message: localize(
            "multipleOfWarning",
            "Value is not divisible by {0}.",
            schema.multipleOf
          ),
        });
      }
    }
    function getExclusiveLimit(
      limit: number | undefined,
      exclusive: boolean | number | undefined
    ): number | undefined {
      if (isNumber(exclusive)) {
        return exclusive;
      }
      if (isBoolean(exclusive) && exclusive) {
        return limit;
      }
      return undefined;
    }
    function getLimit(
      limit: number | undefined,
      exclusive: boolean | number | undefined
    ): number | undefined {
      if (!isBoolean(exclusive) || !exclusive) {
        return limit;
      }
      return undefined;
    }
    const exclusiveMinimum = getExclusiveLimit(
      schema.minimum,
      schema.exclusiveMinimum
    );
    if (isNumber(exclusiveMinimum) && val <= exclusiveMinimum) {
      validationResult.problems.push({
        location: { offset: node.offset, length: node.length },
        message: localize(
          "exclusiveMinimumWarning",
          "Value is below the exclusive minimum of {0}.",
          exclusiveMinimum
        ),
      });
    }
    const exclusiveMaximum = getExclusiveLimit(
      schema.maximum,
      schema.exclusiveMaximum
    );
    if (isNumber(exclusiveMaximum) && val >= exclusiveMaximum) {
      validationResult.problems.push({
        location: { offset: node.offset, length: node.length },
        message: localize(
          "exclusiveMaximumWarning",
          "Value is above the exclusive maximum of {0}.",
          exclusiveMaximum
        ),
      });
    }
    const minimum = getLimit(schema.minimum, schema.exclusiveMinimum);
    if (isNumber(minimum) && val < minimum) {
      validationResult.problems.push({
        location: { offset: node.offset, length: node.length },
        message: localize(
          "minimumWarning",
          "Value is below the minimum of {0}.",
          minimum
        ),
      });
    }
    const maximum = getLimit(schema.maximum, schema.exclusiveMaximum);
    if (isNumber(maximum) && val > maximum) {
      validationResult.problems.push({
        location: { offset: node.offset, length: node.length },
        message: localize(
          "maximumWarning",
          "Value is above the maximum of {0}.",
          maximum
        ),
      });
    }
  }

  function _validateStringNode(
    node: StringASTNode,
    schema: JSONSchema,
    validationResult: ValidationResult,
    matchingSchemas: ISchemaCollector
  ): void {
    if (isNumber(schema.minLength) && node.value.length < schema.minLength) {
      validationResult.problems.push({
        location: { offset: node.offset, length: node.length },
        message: localize(
          "minLengthWarning",
          "String is shorter than the minimum length of {0}.",
          schema.minLength
        ),
      });
    }

    if (isNumber(schema.maxLength) && node.value.length > schema.maxLength) {
      validationResult.problems.push({
        location: { offset: node.offset, length: node.length },
        message: localize(
          "maxLengthWarning",
          "String is longer than the maximum length of {0}.",
          schema.maxLength
        ),
      });
    }

    if (isString(schema.pattern)) {
      //   const regex = extendedRegExp(schema.pattern);
      const regex = new RegExp(schema.pattern);
      if (!regex?.test(node.value)) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message:
            schema.patternErrorMessage ||
            schema.errorMessage ||
            localize(
              "patternWarning",
              'String does not match the pattern of "{0}".',
              schema.pattern
            ),
        });
      }
    }

    if (schema.format) {
      switch (schema.format) {
        case "uri":
        case "uri-reference":
          {
            let errorMessage;
            if (!node.value) {
              errorMessage = localize("uriEmpty", "URI expected.");
            } else {
              const match =
                /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/.exec(
                  node.value
                );
              if (!match) {
                errorMessage = localize("uriMissing", "URI is expected.");
              } else if (!match[2] && schema.format === "uri") {
                errorMessage = localize(
                  "uriSchemeMissing",
                  "URI with a scheme is expected."
                );
              }
            }
            if (errorMessage) {
              validationResult.problems.push({
                location: { offset: node.offset, length: node.length },
                message:
                  schema.patternErrorMessage ||
                  schema.errorMessage ||
                  localize(
                    "uriFormatWarning",
                    "String is not a URI: {0}",
                    errorMessage
                  ),
              });
            }
          }
          break;
        case "color-hex":
        case "date-time":
        case "date":
        case "time":
        case "email":
          const format = formats[schema.format];
          if (!node.value || !format.pattern.exec(node.value)) {
            validationResult.problems.push({
              location: { offset: node.offset, length: node.length },
              message:
                schema.patternErrorMessage ||
                schema.errorMessage ||
                format.errorMessage,
            });
          }
        default:
      }
    }
  }
  function _validateArrayNode(
    node: ArrayASTNode,
    schema: JSONSchema,
    validationResult: ValidationResult,
    matchingSchemas: ISchemaCollector
  ): void {
    if (Array.isArray(schema.items)) {
      const subSchemas = schema.items;
      for (let index = 0; index < subSchemas.length; index++) {
        const subSchemaRef = subSchemas[index];
        const subSchema = asSchema(subSchemaRef);
        const itemValidationResult = new ValidationResult();
        const item = node.items[index];
        if (item) {
          validate(item, subSchema!, itemValidationResult, matchingSchemas);
          validationResult.mergePropertyMatch(itemValidationResult);
        } else if (node.items.length >= subSchemas.length) {
          validationResult.propertiesValueMatches++;
        }
      }
      if (node.items.length > subSchemas.length) {
        if (typeof schema.additionalItems === "object") {
          for (let i = subSchemas.length; i < node.items.length; i++) {
            const itemValidationResult = new ValidationResult();
            validate(
              node.items[i],
              <any>schema.additionalItems,
              itemValidationResult,
              matchingSchemas
            );
            validationResult.mergePropertyMatch(itemValidationResult);
          }
        } else if (schema.additionalItems === false) {
          validationResult.problems.push({
            location: { offset: node.offset, length: node.length },
            message: localize(
              "additionalItemsWarning",
              "Array has too many items according to schema. Expected {0} or fewer.",
              subSchemas.length
            ),
          });
        }
      }
    } else {
      const itemSchema = asSchema(schema.items);
      if (itemSchema) {
        for (const item of node.items) {
          const itemValidationResult = new ValidationResult();
          validate(item, itemSchema, itemValidationResult, matchingSchemas);
          validationResult.mergePropertyMatch(itemValidationResult);
        }
      }
    }

    const containsSchema = asSchema(schema.contains);
    if (containsSchema) {
      const doesContain = node.items.some((item) => {
        const itemValidationResult = new ValidationResult();
        validate(
          item,
          containsSchema,
          itemValidationResult,
          NoOpSchemaCollector.instance
        );
        return !itemValidationResult.hasProblems();
      });

      if (!doesContain) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message:
            schema.errorMessage ||
            localize(
              "requiredItemMissingWarning",
              "Array does not contain required item."
            ),
        });
      }
    }

    if (isNumber(schema.minItems) && node.items.length < schema.minItems) {
      validationResult.problems.push({
        location: { offset: node.offset, length: node.length },
        message: localize(
          "minItemsWarning",
          "Array has too few items. Expected {0} or more.",
          schema.minItems
        ),
      });
    }

    if (isNumber(schema.maxItems) && node.items.length > schema.maxItems) {
      validationResult.problems.push({
        location: { offset: node.offset, length: node.length },
        message: localize(
          "maxItemsWarning",
          "Array has too many items. Expected {0} or fewer.",
          schema.maxItems
        ),
      });
    }

    if (schema.uniqueItems === true) {
      const values = getNodeValue(node);
      const duplicates = values.some((value: any, index: number) => {
        return index !== values.lastIndexOf(value);
      });
      if (duplicates) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message: localize("uniqueItemsWarning", "Array has duplicate items."),
        });
      }
    }
  }

  function _validateObjectNode(
    node: ObjectASTNode,
    schema: JSONSchema,
    validationResult: ValidationResult,
    matchingSchemas: ISchemaCollector
  ): void {
    const seenKeys: { [key: string]: ASTNode | undefined } =
      Object.create(null);
    const unprocessedProperties: string[] = [];
    for (const propertyNode of node.properties) {
      const key = propertyNode.keyNode.value;
      seenKeys[key] = propertyNode.valueNode;
      unprocessedProperties.push(key);
    }

    if (Array.isArray(schema.required)) {
      for (const propertyName of schema.required) {
        if (!seenKeys[propertyName]) {
          const keyNode =
            node.parent &&
            node.parent.type === "property" &&
            node.parent.keyNode;
          const location = keyNode
            ? { offset: keyNode.offset, length: keyNode.length }
            : { offset: node.offset, length: 1 };
          validationResult.problems.push({
            location: location,
            message: localize(
              "MissingRequiredPropWarning",
              'Missing property "{0}".',
              propertyName
            ),
          });
        }
      }
    }

    const propertyProcessed = (prop: string) => {
      let index = unprocessedProperties.indexOf(prop);
      while (index >= 0) {
        unprocessedProperties.splice(index, 1);
        index = unprocessedProperties.indexOf(prop);
      }
    };

    if (schema.properties) {
      for (const propertyName of Object.keys(schema.properties)) {
        propertyProcessed(propertyName);
        const propertySchema = schema.properties[propertyName];
        const child = seenKeys[propertyName];
        if (child) {
          if (isBoolean(propertySchema)) {
            if (!propertySchema) {
              const propertyNode = <PropertyASTNode>child.parent;
              validationResult.problems.push({
                location: {
                  offset: propertyNode.keyNode.offset,
                  length: propertyNode.keyNode.length,
                },
                message:
                  schema.errorMessage ||
                  localize(
                    "DisallowedExtraPropWarning",
                    "Property {0} is not allowed.",
                    propertyName
                  ),
              });
            } else {
              validationResult.propertiesMatches++;
              validationResult.propertiesValueMatches++;
            }
          } else {
            const propertyValidationResult = new ValidationResult();
            validate(
              child,
              propertySchema,
              propertyValidationResult,
              matchingSchemas
            );
            validationResult.mergePropertyMatch(propertyValidationResult);
          }
        }
      }
    }

    if (schema.patternProperties) {
      for (const propertyPattern of Object.keys(schema.patternProperties)) {
        // const regex = extendedRegExp(propertyPattern);
        const regex = new RegExp(propertyPattern);
        for (const propertyName of unprocessedProperties.slice(0)) {
          if (regex?.test(propertyName)) {
            propertyProcessed(propertyName);
            const child = seenKeys[propertyName];
            if (child) {
              const propertySchema = schema.patternProperties[propertyPattern];
              if (isBoolean(propertySchema)) {
                if (!propertySchema) {
                  const propertyNode = <PropertyASTNode>child.parent;
                  validationResult.problems.push({
                    location: {
                      offset: propertyNode.keyNode.offset,
                      length: propertyNode.keyNode.length,
                    },
                    message:
                      schema.errorMessage ||
                      localize(
                        "DisallowedExtraPropWarning",
                        "Property {0} is not allowed.",
                        propertyName
                      ),
                  });
                } else {
                  validationResult.propertiesMatches++;
                  validationResult.propertiesValueMatches++;
                }
              } else {
                const propertyValidationResult = new ValidationResult();
                validate(
                  child,
                  propertySchema,
                  propertyValidationResult,
                  matchingSchemas
                );
                validationResult.mergePropertyMatch(propertyValidationResult);
              }
            }
          }
        }
      }
    }

    if (typeof schema.additionalProperties === "object") {
      for (const propertyName of unprocessedProperties) {
        const child = seenKeys[propertyName];
        if (child) {
          const propertyValidationResult = new ValidationResult();
          validate(
            child,
            <any>schema.additionalProperties,
            propertyValidationResult,
            matchingSchemas
          );
          validationResult.mergePropertyMatch(propertyValidationResult);
        }
      }
    } else if (schema.additionalProperties === false) {
      if (unprocessedProperties.length > 0) {
        for (const propertyName of unprocessedProperties) {
          const child = seenKeys[propertyName];
          if (child) {
            const propertyNode = <PropertyASTNode>child.parent;

            validationResult.problems.push({
              location: {
                offset: propertyNode.keyNode.offset,
                length: propertyNode.keyNode.length,
              },
              message:
                schema.errorMessage ||
                localize(
                  "DisallowedExtraPropWarning",
                  "Property {0} is not allowed.",
                  propertyName
                ),
            });
          }
        }
      }
    }

    if (isNumber(schema.maxProperties)) {
      if (node.properties.length > schema.maxProperties) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message: localize(
            "MaxPropWarning",
            "Object has more properties than limit of {0}.",
            schema.maxProperties
          ),
        });
      }
    }

    if (isNumber(schema.minProperties)) {
      if (node.properties.length < schema.minProperties) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message: localize(
            "MinPropWarning",
            "Object has fewer properties than the required number of {0}",
            schema.minProperties
          ),
        });
      }
    }

    if (schema.dependencies) {
      for (const key of Object.keys(schema.dependencies)) {
        const prop = seenKeys[key];
        if (prop) {
          const propertyDep = schema.dependencies[key];
          if (Array.isArray(propertyDep)) {
            for (const requiredProp of propertyDep) {
              if (!seenKeys[requiredProp]) {
                validationResult.problems.push({
                  location: { offset: node.offset, length: node.length },
                  message: localize(
                    "RequiredDependentPropWarning",
                    "Object is missing property {0} required by property {1}.",
                    requiredProp,
                    key
                  ),
                });
              } else {
                validationResult.propertiesValueMatches++;
              }
            }
          } else {
            const propertySchema = asSchema(propertyDep);
            if (propertySchema) {
              const propertyValidationResult = new ValidationResult();
              validate(
                node,
                propertySchema,
                propertyValidationResult,
                matchingSchemas
              );
              validationResult.mergePropertyMatch(propertyValidationResult);
            }
          }
        }
      }
    }

    const propertyNames = asSchema(schema.propertyNames);
    if (propertyNames) {
      for (const f of node.properties) {
        const key = f.keyNode;
        if (key) {
          validate(
            key,
            propertyNames,
            validationResult,
            NoOpSchemaCollector.instance
          );
        }
      }
    }
  }
}
