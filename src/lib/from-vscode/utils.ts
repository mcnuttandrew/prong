import * as Json from "jsonc-parser";
import { JSONSchemaRef, JSONSchema } from "../JSONSchemaTypes";
import { ASTNode } from "./parser";
import * as nls from "vscode-nls";
let localize = nls.loadMessageBundle();

export function isNumber(val: any): val is number {
  return typeof val === "number";
}

export function isDefined(val: any): val is object {
  return typeof val !== "undefined";
}

export function isBoolean(val: any): val is boolean {
  return typeof val === "boolean";
}

export function isString(val: any): val is string {
  return typeof val === "string";
}

export function getNodeValue(node: ASTNode): any {
  return Json.getNodeValue(node);
}

export function asSchema(
  schema: JSONSchemaRef | undefined
): JSONSchema | undefined {
  if (isBoolean(schema)) {
    return schema ? {} : { not: {} };
  }
  return schema;
}

export function contains(
  node: ASTNode,
  offset: number,
  includeRightBound = false
): boolean {
  return (
    (offset >= node.offset && offset < node.offset + node.length) ||
    (includeRightBound && offset === node.offset + node.length)
  );
}

export function equals(one: any, other: any): boolean {
  if (one === other) {
    return true;
  }
  if (
    one === null ||
    one === undefined ||
    other === null ||
    other === undefined
  ) {
    return false;
  }
  if (typeof one !== typeof other) {
    return false;
  }
  if (typeof one !== "object") {
    return false;
  }
  if (Array.isArray(one) !== Array.isArray(other)) {
    return false;
  }

  var i: number, key: string;

  if (Array.isArray(one)) {
    if (one.length !== other.length) {
      return false;
    }
    for (i = 0; i < one.length; i++) {
      if (!equals(one[i], other[i])) {
        return false;
      }
    }
  } else {
    var oneKeys: string[] = [];

    for (key in one) {
      oneKeys.push(key);
    }
    oneKeys.sort();
    var otherKeys: string[] = [];
    for (key in other) {
      otherKeys.push(key);
    }
    otherKeys.sort();
    if (!equals(oneKeys, otherKeys)) {
      return false;
    }
    for (i = 0; i < oneKeys.length; i++) {
      if (!equals(one[oneKeys[i]], other[oneKeys[i]])) {
        return false;
      }
    }
  }
  return true;
}

export enum ErrorCode {
  Undefined = 0,
  EnumValueMismatch = 1,
  Deprecated = 2,
  UnexpectedEndOfComment = 0x101,
  UnexpectedEndOfString = 0x102,
  UnexpectedEndOfNumber = 0x103,
  InvalidUnicode = 0x104,
  InvalidEscapeCharacter = 0x105,
  InvalidCharacter = 0x106,
  PropertyExpected = 0x201,
  CommaExpected = 0x202,
  ColonExpected = 0x203,
  ValueExpected = 0x204,
  CommaOrCloseBacketExpected = 0x205,
  CommaOrCloseBraceExpected = 0x206,
  TrailingComma = 0x207,
  DuplicateKey = 0x208,
  CommentNotPermitted = 0x209,
  SchemaResolveError = 0x300,
}
