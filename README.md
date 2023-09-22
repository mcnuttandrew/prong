# Prong

Prong (PRojectional jsON Gui) is an editor framework for creating bespoke in-browser editors for JSON-based domain-specific languages (such as [Vega](https://vega.github.io/vega/), [Vega-Lite](https://vega.github.io/vega-lite/), [Tracery](https://tracery.io/), and [many others](https://vis-json-dsls.netlify.app/)). These editors allow for things like drag-and-drop interactions, inline-interactive spreadsheets, in-situ recommenders and sparklines, and many more elements that would require significant engineering effort to create otherwise.

Prong is a projectional editing system, which we see as being made up of two pieces:

1. Structure editing, which allows you to manipulate text without requiring that you manually type out that text (we mostly do this through a special floating menu that is aware of the types of the DSLs). We achieve this by asking that you hand us a [JSON schema](https://json-schema.org/) describing your language.
2. Alternative views (which we generally refer to as projections) that re-present parts of the text in means that are more meaningful to the domain at hand (like adding a dropdown for an field that has only a fixed set of options). We achieve this by asking you describe your projections using a little query language (see [below](#queries)) and plain ol react components.

In tandem this allows for some pretty interesting editing experiences to be made pretty easily, for instance:

![Example image of the prong editor framework instantiated for a vega-lite style application](https://github.com/mcnuttandrew/prong/raw/main/example.png)

See the [docs site](https://prong-editor.netlify.app/) (where you may already be) to see a variety of examples. Please note that this is research grade software, so there are bugs and issues throughout, but we welcome any help or contributions you might wish to provide.

This work is described in much greater depth in our upcoming paper ["Projectional Editors for JSON-based DSLs"](http://arxiv.org/abs/2307.11260).

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

### What about authoring my own projections??

Authoring your own projections is also reasonably straightforward. We have a number of examples throughout the code base that you might look at for inspiration of how to define ad hoc projections (cf [sites/docs/src/examples/](https://github.com/mcnuttandrew/prong/tree/main/sites/docs/src/examples)) as well as more structured repeatable ones (cf [packages/prong-editor/projections/](https://github.com/mcnuttandrew/prong/tree/main/packages/prong-editor/src/projections)). But should you want a quick start, here's an example projection that will appear in the floating tooltip menu

```tsx
import { utils, Projection } from "prong-editor";
import friendlyWords from "friendly-words";

const titleCase = (word: string) => `${word[0].toUpperCase()}${word.slice(1)}`;
const pick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

function generateName() {
  const adj = pick(friendlyWords.predicates);
  const obj = titleCase(pick(friendlyWords.objects));
  return `${adj}${obj}`;
}

const RandomWordProjection: Projection = {
  // where to put the projection
  query: { type: "regex", query: /".*"/ },
  // should it appear in the tooltip or inline?
  type: "tooltip",
  // what should it look like
  projection: ({ keyPath, setCode, fullCode }) => {
    const click = () =>
      setCode(utils.setIn(keyPath, `"${generateName()}"`, fullCode));
    return <button onClick={click}>Random Word</button>;
  },
  // what group should the projection appear in
  name: "Utils",
};

export default RandomWordProjection;
```

See below for [additional details](#projections) on the semantics of projection definition.

### Gotchas

- We don't automatically import schemas. Its very easy to import a schema (they are just JSON after all) and so we would prefer not to create an import dep for you

- The editor excepts a string! It is very easy to accidentally forget and hand it a parsed object rather than a string describing a json object.

- This system isn't really for interacting with data. There are lots of other great systems for wrangling JSON data of various kinds (such as [JSON Crack](https://jsoncrack.com/), [jq](https://jqlang.github.io/jq/), and many others), it's just for DSL style usage. The affordances required for each type of usage are related, but are somewhat distinct!

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

### Tooltip Projection Projection

This projection creates a menu item that will appear in the tooltip, monocle, or dock (depending on what the user wants in a given moment).

```tsx
{
  // the name of the projection, used to opt in/opt out
  name: string;
  // the heading that the projection will appear under
  group: string;
  projection: (props: ProjectionProps) => JSX.Element;
  query: ProjectionQuery;
  type: "tooltip";
  // whether or not this projection takes over the whole menu
  // note that the first provided projections takes precedence
  takeOverMenu?: boolean;
}
```

See [Queries](#queries) below for an example of the query system.
The name describe which heading the projection will be grouped into.
The projection creates the specific element that inserted into the menu, it expects a function that returns a react component. It gets props like

```tsx
interface ProjectionProps {
  //  code snippet of the current node, it is provided as a convenience as you could get it from fullCode.slice(node.from, node.to)
  currentValue: any;

  // a list of cursor positions, it is useful for interacting with the cursor. diagnosticErrors is an array of lint errors.
  cursorPositions: any[];

  // lint errors from the current position (based on the schema)
  diagnosticErrors: Diagnostic[];

  // the full code in the document at the current moment.
  fullCode: string;

  // the access path for the value in the json object, note that if trying to access the value in a property (eg if you have [{"a": "b"}] and you want b) you need to add a `___value` tailing element. So for that example we would do `[0, "a", "a___value"]`.
  keyPath: (string | number)[];

  // the AST node generated by code mirror (see [their docs](https://lezer.codemirror.net/docs/ref/#common.SyntaxNode) for more details).
  node: SyntaxNode;

  // allows you to set the code in the document, it will trigger an onUpdate event.
  setCode: (code: string) => void;

  // typings the inferred typings from the JSON Schema for the node.
  typings: any[];
}
```

### Inline Projection

Use this projection type to place projections into the editor itself.

```tsx
{
  // the name of the projection, used to opt in/opt out
  name: string;
  // whether or not the react component has internal state, more aggressively removed it does not have internal state
  hasInternalState: boolean;
  // if a projection requires multiple lines of a DSL (say bc you are replacing a multiline data set or something) you must use replace-multiline
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
  // the name of the projection, used to opt in/opt out
  name: string;
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
  query: (
    value: string,
    nodeType: NodeType,
    keyPath: KeyPath,
    cursorPos: number,
    nodePos: { start: number; end: number }
  ) => boolean;
}
```

If none of these work for you there is also a function query type. This is obviously the most expensive to run, so should be avoided where possible. Useful for doing checks within a string.

## Local development

Clone the repo as you might usually.

1. install package deps (cd packages/prong-editor, yarn)
2. install docs deps (cd sites/docs, yarn)
3. run some scripts (cd sites/docs, yarn post-build, yarn prep-data)
4. Run locally (cd sites/docs, yarn dev)
