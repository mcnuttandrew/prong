# Prong

This is the Prong editor framework. The goal of this system is to provide a simple way to create in-situ editor extensions for in-browser editors of JSON domain specific languages.
The basic dependencies of this system are code mirror (which we wrap) and react (which we use as means to specify the extensions).

This is described in our upcoming paper "Projectional Editors for JSON DSLs". Please note that this is research grade software, so there are bugs and issues throughout.

## Quick start example usage

```tsx
import { useState } from "react";

import { Editor, StandardBundle } from "prong-editor";
import "prong-editor/style.css";

const exampleData = `{
    "a": {
      "b": [1, 2, 3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": 4, "g": 5 }],
    "I": "example",
  }`;

function SimpleExample() {
  const [currentCode, setCurrentCode] = useState(exampleData);

  return (
    <Editor
      schema={{}}
      code={currentCode}
      onChange={(x) => setCurrentCode(x)}
      projections={Object.values(StandardBundle)}
    />
  );
}
```

To install follow the usual methods:

```
yarn add prong-editor
```

Dont forget to import our css file!

## Component

The library consists of a single component it has a type like

```tsx
<Editor {...{
  onChange: (code: string) => void;
  code: string;
  schema: JSONSchema;
  projections?: Projection[];
  height?: string;
  onTargetNodeChanged?: (newNode: any, oldNode: any) => void;
}} />
```

## Standard Bundle

We include a variety of common projections that you might find useful

```tsx
{
  BooleanTarget, // add check boxes to boolean
    CleanUp, // add a "clean up" button to the menu that pretty formats the code
    ClickTarget, // add like rectangles that make it feel nice to click {s
    ColorChip, // add a little colored circle next to colors
    ConvertHex, // add a button to the tooltip that allows you to convert named colors to hex
    Debugger, // for each AST show all the information we have about it in the tooltip
    InsertRandomWord, // insert a random word
    NumberSlider, // number slider
    SortObject, // Sort the keys in an object
    TooltipColorNamePicker, // select a named color from a fancy menu of web colors
    TooltipHexColorPicker; // select a color using a hex color picker
}
```

You dont have to include any of them or all of them, its presented as an object so you can select what you want.

## Utils

We provide a handful utilities to make the construction of these editors less painful:

```ts
// make a simple modification to a json string
function setIn(
  keyPath: (string | number)[],
  newValue: any,
  content: string
): string;
```

```ts
// a simple prettification algorithm tuned to json specifically
function prettifier(
  passedObj: any,
  options?: {
    indent?: string | undefined;
    maxLength?: number | undefined;
    replacer?: ((this: any, key: string, value: any) => any) | undefined;
  }
): string;
```

```ts
// a simple wrapper around a forgiving json parser
function simpleParse(content: any, defaultVal?: {}): any;
```

```ts
// maybe remove double quotes from a string, handy for some styling tasks
const maybeTrim: (x: string) => string;
```

## Projections

The central design abstraction in Prong are projections. These are lightweight ways to modify the text within the editor to fit your goals.

There are four types of projections.

### Tooltip Projection/ Full Tooltip Projection

The two types of projections are closely related, both of them create a menu item that will appear in the tooltip or the dock (depending on what the user wants in a given moment).
Here are the types for each of the objects

```tsx
{
  name: string;
  projection: (props: ProjectionProps) => JSX.Element;
  query: ProjectionQuery;
  type: "tooltip";
}
```

(Note that `Projection` and `ProjectionProps` are both exported types)

```tsx
{
  name: string;
  projection: (props: ProjectionProps) => JSX.Element;
  query: ProjectionQuery;
  type: "full-tooltip";
}
```

See [Queries](asddsa) below for an example of the query system.
The name describe which heading the projection will be grouped into.
The projection creates the specific element that inserted into the menu, it expects a function that returns a react component. It gets props like

```tsx
interface ProjectionProps {
  currentValue: any;
  cursorPositions: any[];
  diagnosticErrors: Diagnostic[];
  fullCode: string;
  keyPath: (string | number)[];
  node: SyntaxNode;
  setCode: (code: string) => void;
  typings: any[];
}
```

currentValue is the code snippet of the current node, it is provided as a convenience as you could get it from fullCode.slice(node.from, node.to)
cursorPositions is a list of cursor positions, it is useful for interacting with the cursor.
diagnosticErrors is an array of lint errors.
fullCode is the full code in the document at the current moment.
keyPath is the access path for the value in the json object, note that if trying to access the value in a property (eg if you have [{"a": "b"}] and you want b) you need to add a `___value` tailing element. So for that example we would do `[0, "a", "a___value"]`.
node is the AST node generated by code mirror (see [their docs](https://lezer.codemirror.net/docs/ref/#common.SyntaxNode) for more details).
setCode allows you to set the code in the document, it will trigger an onUpdate event.
typings the inferred typings from the JSON Schema for the node.

### Inline Projection

Use this projection type to place projections into the editor itself.

```tsx
{
  hasInternalState: boolean;
  mode: "replace" | "prefix" | "suffix" | "replace-multiline";
  projection: (props: ProjectionProps) => JSX.Element;
  query: ProjectionQuery;
  type: "inline";
}
```

### Highlight Projection

This simplest of the projections allows you to add a css class to whatever elements in the editor you might wish to. See examples/TraceryExample for example usage.

```tsx
{
  class: string;
  query: ProjectionQuery;
  type: "highlight";
}
```

## Queries

A critical part of the projection system are the queries. These small functions allow the system to check when and where each component should be inserted.

These come in a variety of flavors

- **Index Queries**:

```tsx
{ type: "index"; query: (number | string)[] }
```

Where number|string is a key path. Note that is strictly the fastest and most accurate of the query types, as we can identify things unambiguously.

- **Regex Queries**:

```tsx
{
  type: "regex";
  query: RegExp;
}
```

Check if a value matches a regex

- **Value Queries**:

```tsx
{ type: "value"; query: string[] }
```

Check if a value is equal to any of several strings.

- **Schema Queries**:

```tsx
{ type: "schemaMatch"; query: string[] }
```

Check if a node has inferred type (from the JSON Schema) equal to one of several node types. Refer to your json schema for the names that are checked.

- **Node Type Queries**:

```tsx
{ type: "nodeType"; query: NodeType[] };
```

These queries allow you to check for a given AST node type. The JSON AST includes the following symbols: `String`, `Number`, `True`, `False`, `Null`, `Object`, `Array`, `Property`, `PropertyName`, `{`, `},` `[`, `]`, and `⚠` (which describes parse errors).

- **Function Queries**:

```tsx
{
  type: "function";
  query: (value: string, nodeType: NodeType, keyPath: KeyPath) => boolean;
}
```

If none of these work for you there is also a function query type. This is obviously the most expensive to run, so should be avoided where possible.
