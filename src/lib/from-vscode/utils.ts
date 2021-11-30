import * as Json from "jsonc-parser";
import { JSONSchemaRef, JSONSchema, JSONSchemaMap } from "../JSONSchemaTypes";
import * as nls from "vscode-nls";
import { ASTNode } from "./parser";
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

// const URI = './';
function normalizeId(id: string): string {
  return id;
  // TODO
  // remove trailing '#', normalize drive capitalization
  // try {
  //   return URI.parse(id).toString();
  // } catch (e) {
  //   return id;
  // }
}

type SchemaDependencies = Set<any>;

export function resolveSchemaContent(
  schemaToResolve: JSONSchema,
  schemaURL: string,
  dependencies: SchemaDependencies
): Promise<JSONSchema> {
  // const resolveErrors: string[] = schemaToResolve.errors.slice(0);
  // const schema = schemaToResolve.schema;
  const resolveErrors: string[] = [];
  const schema = schemaToResolve;

  if (schema.$schema) {
    const id = normalizeId(schema.$schema);
    if (id === "http://json-schema.org/draft-03/schema") {
      return Promise.resolve(
        new ResolvedSchema({}, [
          localize(
            "json.schema.draft03.notsupported",
            "Draft-03 schemas are not supported."
          ),
        ])
      );
    } else if (id === "https://json-schema.org/draft/2019-09/schema") {
      resolveErrors.push(
        localize(
          "json.schema.draft201909.notsupported",
          "Draft 2019-09 schemas are not yet fully supported."
        )
      );
    } else if (id === "https://json-schema.org/draft/2020-12/schema") {
      resolveErrors.push(
        localize(
          "json.schema.draft202012.notsupported",
          "Draft 2020-12 schemas are not yet fully supported."
        )
      );
    }
  }

  // const contextService = this.contextService;

  const findSection = (schema: JSONSchema, path: string | undefined): any => {
    if (!path) {
      return schema;
    }
    let current: any = schema;
    if (path[0] === "/") {
      path = path.substr(1);
    }
    path.split("/").some((part) => {
      part = part.replace(/~1/g, "/").replace(/~0/g, "~");
      current = current[part];
      return !current;
    });
    return current;
  };

  const merge = (
    target: JSONSchema,
    sourceRoot: JSONSchema,
    sourceURI: string,
    refSegment: string | undefined
  ): void => {
    const path = refSegment ? decodeURIComponent(refSegment) : undefined;
    const section = findSection(sourceRoot, path);
    if (section) {
      for (const key in section) {
        if (section.hasOwnProperty(key) && !target.hasOwnProperty(key)) {
          (<any>target)[key] = section[key];
        }
      }
    } else {
      resolveErrors.push(
        localize(
          "json.schema.invalidref",
          "$ref '{0}' in '{1}' can not be resolved.",
          path,
          sourceURI
        )
      );
    }
  };

  const resolveExternalLink = (
    node: JSONSchema,
    uri: string,
    refSegment: string | undefined,
    parentSchemaURL: string,
    parentSchemaDependencies: SchemaDependencies
  ): Promise<any> => {
    // if (contextService && !/^[A-Za-z][A-Za-z0-9+\-.+]*:\/\/.*/.test(uri)) {
    //   uri = contextService.resolveRelativePath(uri, parentSchemaURL);
    // }
    uri = normalizeId(uri);
    // const referencedHandle = this.getOrAddSchemaHandle(uri);
    const referencedHandle = getOrAddSchemaHandle(uri);
    return referencedHandle.getUnresolvedSchema().then((unresolvedSchema) => {
      parentSchemaDependencies.add(uri);
      if (unresolvedSchema.errors.length) {
        const loc = refSegment ? uri + "#" + refSegment : uri;
        resolveErrors.push(
          localize(
            "json.schema.problemloadingref",
            "Problems loading reference '{0}': {1}",
            loc,
            unresolvedSchema.errors[0]
          )
        );
      }
      merge(node, unresolvedSchema.schema, uri, refSegment);
      return resolveRefs(
        node,
        unresolvedSchema.schema,
        uri,
        referencedHandle.dependencies
      );
    });
  };

  const resolveRefs = (
    node: JSONSchema,
    parentSchema: JSONSchema,
    parentSchemaURL: string,
    parentSchemaDependencies: SchemaDependencies
  ): Promise<any> => {
    if (!node || typeof node !== "object") {
      return Promise.resolve(null);
    }

    const toWalk: JSONSchema[] = [node];
    const seen = new Set<JSONSchema>();

    const openPromises: Promise<any>[] = [];

    const collectEntries = (...entries: (JSONSchemaRef | undefined)[]) => {
      for (const entry of entries) {
        if (typeof entry === "object") {
          toWalk.push(entry);
        }
      }
    };
    const collectMapEntries = (...maps: (JSONSchemaMap | undefined)[]) => {
      for (const map of maps) {
        if (typeof map === "object") {
          for (const k in map) {
            const key = k as keyof JSONSchemaMap;
            const entry = map[key];
            if (typeof entry === "object") {
              toWalk.push(entry);
            }
          }
        }
      }
    };
    const collectArrayEntries = (
      ...arrays: (JSONSchemaRef[] | undefined)[]
    ) => {
      for (const array of arrays) {
        if (Array.isArray(array)) {
          for (const entry of array) {
            if (typeof entry === "object") {
              toWalk.push(entry);
            }
          }
        }
      }
    };
    const handleRef = (next: JSONSchema) => {
      const seenRefs = new Set<string>();
      while (next.$ref) {
        const ref = next.$ref;
        const segments = ref.split("#", 2);
        delete next.$ref;
        if (segments[0].length > 0) {
          openPromises.push(
            resolveExternalLink(
              next,
              segments[0],
              segments[1],
              parentSchemaURL,
              parentSchemaDependencies
            )
          );
          return;
        } else {
          if (!seenRefs.has(ref)) {
            merge(next, parentSchema, parentSchemaURL, segments[1]); // can set next.$ref again, use seenRefs to avoid circle
            seenRefs.add(ref);
          }
        }
      }

      collectEntries(
        <JSONSchema>next.items,
        next.additionalItems,
        <JSONSchema>next.additionalProperties,
        next.not,
        next.contains,
        next.propertyNames,
        next.if,
        next.then,
        next.else
      );
      collectMapEntries(
        next.definitions,
        next.properties,
        next.patternProperties,
        <JSONSchemaMap>next.dependencies
      );
      collectArrayEntries(
        next.anyOf,
        next.allOf,
        next.oneOf,
        <JSONSchema[]>next.items
      );
    };

    while (toWalk.length) {
      const next = toWalk.pop()!;
      if (seen.has(next)) {
        continue;
      }
      seen.add(next);
      handleRef(next);
    }
    return Promise.all(openPromises);
  };

  return resolveRefs(schema, schema, schemaURL, dependencies).then(
    () => schema
  );
}
