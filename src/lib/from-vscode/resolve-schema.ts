/* eslint-disable */
import * as nls from "vscode-nls";
import { JSONSchema, JSONSchemaRef, JSONSchemaMap } from "../JSONSchemaTypes";
import { asSchema } from "./utils";

let localize = nls.loadMessageBundle();

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

type SchemaDependencies = Set<string>;

export function resolveSchemaContent(
  schemaToResolve: JSONSchema,
  schemaURL: string,
  dependencies: SchemaDependencies
): Promise<ResolvedSchema> {
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
    // const referencedHandle = getOrAddSchemaHandle(uri);
    const referencedHandle = new SchemaHandle(
      // this,
      uri
      // unresolvedSchemaContent
    );
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
              // THE WHOLE PURPOSE OF VENDORING THIS GIANT LIBRARY,
              // JUST TO ADD THIS ONE LINE BASICALLY
              if (key) {
                entry.$$labeledType = `${key}`;
              }
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
    (_) => new ResolvedSchema(schema, resolveErrors)
  );
}

export interface ISchemaHandle {
  /**
   * The schema id
   */
  uri: string;

  /**
   * The schema from the file, with potential $ref references
   */
  getUnresolvedSchema(): Promise<UnresolvedSchema>;

  /**
   * The schema from the file, with references resolved
   */
  getResolvedSchema(): Promise<ResolvedSchema>;
}

class SchemaHandle implements ISchemaHandle {
  public readonly uri: string;
  public readonly dependencies: SchemaDependencies;

  private resolvedSchema: Promise<ResolvedSchema> | undefined;
  private unresolvedSchema: Promise<UnresolvedSchema> | undefined;
  // private readonly service: JSONSchemaService;

  constructor(
    // service: JSONSchemaService,
    uri: string,
    unresolvedSchemaContent?: JSONSchema
  ) {
    // this.service = service;
    this.uri = uri;
    this.dependencies = new Set();
    if (unresolvedSchemaContent) {
      this.unresolvedSchema = Promise.resolve(
        new UnresolvedSchema(unresolvedSchemaContent)
      );
    }
  }

  public getUnresolvedSchema(): Promise<UnresolvedSchema> {
    // if (!this.unresolvedSchema) {
    //   this.unresolvedSchema = this.service.loadSchema(this.uri);
    // }
    return this.unresolvedSchema!;
  }

  public getResolvedSchema(): Promise<ResolvedSchema> {
    // if (!this.resolvedSchema) {
    //   this.resolvedSchema = this.getUnresolvedSchema().then((unresolved) => {
    //     return this.service.resolveSchemaContent(
    //       unresolved,
    //       this.uri,
    //       this.dependencies
    //     );
    //   });
    // }
    return this.resolvedSchema!;
  }

  public clearSchema(): boolean {
    const hasChanges = !!this.unresolvedSchema;
    this.resolvedSchema = undefined;
    this.unresolvedSchema = undefined;
    this.dependencies.clear();
    return hasChanges;
  }
}

export class UnresolvedSchema {
  public schema: JSONSchema;
  public errors: string[];

  constructor(schema: JSONSchema, errors: string[] = []) {
    this.schema = schema;
    this.errors = errors;
  }
}

export class ResolvedSchema {
  public schema: JSONSchema;
  public errors: string[];

  constructor(schema: JSONSchema, errors: string[] = []) {
    this.schema = schema;
    this.errors = errors;
  }

  public getSection(path: string[]): JSONSchema | undefined {
    const schemaRef = this.getSectionRecursive(path, this.schema);
    if (schemaRef) {
      return asSchema(schemaRef);
    }
    return undefined;
  }

  private getSectionRecursive(
    path: string[],
    schema: JSONSchemaRef
  ): JSONSchemaRef | undefined {
    if (!schema || typeof schema === "boolean" || path.length === 0) {
      return schema;
    }
    const next = path.shift()!;

    if (schema.properties && typeof schema.properties[next]) {
      return this.getSectionRecursive(path, schema.properties[next]);
    } else if (schema.patternProperties) {
      for (const pattern of Object.keys(schema.patternProperties)) {
        // const regex = Strings.extendedRegExp(pattern);
        const regex = new RegExp(pattern);
        if (regex?.test(next)) {
          return this.getSectionRecursive(
            path,
            schema.patternProperties[pattern]
          );
        }
      }
    } else if (typeof schema.additionalProperties === "object") {
      return this.getSectionRecursive(path, schema.additionalProperties);
    } else if (next.match("[0-9]+")) {
      if (Array.isArray(schema.items)) {
        const index = parseInt(next, 10);
        if (!isNaN(index) && schema.items[index]) {
          return this.getSectionRecursive(path, schema.items[index]);
        }
      } else if (schema.items) {
        return this.getSectionRecursive(path, schema.items);
      }
    }

    return undefined;
  }
}
