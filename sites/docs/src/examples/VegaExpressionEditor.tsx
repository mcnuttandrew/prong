import { useEffect, useRef, useState } from "react";

import { javascript } from "@codemirror/lang-javascript";
import { basicSetup } from "codemirror";
import {
  EditorView,
  ViewUpdate,
  ViewPlugin,
  DecorationSet,
  Decoration,
} from "@codemirror/view";
import { EditorState, Range } from "@codemirror/state";
import { parser } from "@lezer/javascript";

import * as vegaExpression from "vega-expression";
import { walk } from "estree-walker";

import {
  autocompletion,
  CompletionSource,
  snippet,
} from "@codemirror/autocomplete";
import { utils } from "prong-editor";

export type SchemaMap = Record<string, any>;
// vegaExpression.
// javascript.
function tryExpression(code: string, signals: string[]): null | string {
  const signalSet = new Set(signals);
  try {
    walk(vegaExpression.parseExpression(code), {
      enter(node, parent) {
        const parentIsProperty = parent && parent.type === "MemberExpression";
        if (
          node.type === "Identifier" &&
          !parentIsProperty && // to catch the padding.top type cases
          !(termSet.has(node.name) || signalSet.has(node.name))
        ) {
          throw new Error(`${node.name} is not a recongized keyword`);
        }
      },
    });
  } catch (e) {
    return `${e as any as string}`;
  }
  return null;
}

export default function Editor(props: {
  onChange: (code: string) => void;
  code: string;
  terms: string[];
  onError: (errorMessage: string | null) => void;
}) {
  const { code, onChange, terms, onError } = props;
  const cmParent = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<EditorView | null>(null);
  // primary effect, initialize the editor etc
  useEffect(() => {
    const localExtension = EditorView.updateListener.of((v: ViewUpdate) => {
      if (v.docChanged) {
        const newCode = v.state.doc.toString();
        onChange(newCode);
        onError(tryExpression(newCode, props.terms));
      }
    });

    const editorState = EditorState.create({
      extensions: [
        basicSetup,
        analogSyntaxHighlighter,
        javascript(),
        localExtension,
        autocomplete(terms),
      ],
      doc: code,
    })!;
    const view = new EditorView({
      state: editorState,
      parent: cmParent.current!,
    });
    setView(view);
    return () => view.destroy();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (view && view.state.doc.toString() !== code) {
      utils.simpleUpdate(view, 0, view.state.doc.length, code);
    }
  }, [code, view]);
  return (
    <div className="expression-editor">
      <div ref={cmParent} />
    </div>
  );
}

function from(list: string[]): CompletionSource {
  return (cx) => {
    const word = cx.matchBefore(/\w+$/);
    if (!word && !cx.explicit) {
      return null;
    }

    return {
      from: word ? word.from : cx.pos,
      options: [...list, ...terms].map((label) => ({
        label,
        apply: snippet(label),
      })),
      span: /\w*/,
    };
  };
}

function autocomplete(words: string[]) {
  return autocompletion({
    activateOnTyping: true,
    override: [from(words)],
    closeOnBlur: false,
  });
}

const terms = [
  "E",
  "LN10",
  "LN2",
  "LOG10E",
  "LOG2E",
  "MAX_VALUE",
  "MIN_VALUE",
  "NaN",
  "PI",
  "SQRT1_2",
  "SQRT2",
  "abs",
  "acos",
  "asin",
  "atan",
  "atan2",
  "bandspace",
  "bandwidth",
  "ceil",
  "clamp",
  "clampRange",
  "containerSize",
  "contrast",
  "copy",
  "cos",
  "cumulativeLogNormal",
  "cumulativeNormal",
  "cumulativeUniform",
  "data",
  "date",
  "datetime",
  "datum",
  "day",
  "dayAbbrevFormat",
  "dayFormat",
  "dayofyear",
  "debug",
  "densityLogNormal",
  "densityNormal",
  "densityUniform",
  "domain",
  "event",
  "exp",
  "extent",
  "floor",
  "format",
  "geoArea",
  "geoBounds",
  "geoCentroid",
  "gradient",
  "group",
  "hcl",
  "hours",
  "hsl",
  "if",
  "inScope",
  "indata",
  "indexof",
  "indexof",
  "info",
  "inrange",
  "invert",
  "isArray",
  "isBoolean",
  "isDate",
  "isDefined",
  "isFinite",
  "isNaN",
  "isNumber",
  "isObject",
  "isRegExp",
  "isString",
  "isValid",
  "item",
  "join",
  "lab",
  "lastindexof",
  "lastindexof",
  "length",
  "length",
  "lerp",
  "log",
  "lower",
  "luminance",
  "max",
  "merge",
  "milliseconds",
  "min",
  "minutes",
  "month",
  "monthAbbrevFormat",
  "monthFormat",
  "now",
  "pad",
  "panLinear",
  "panLog",
  "panPow",
  "panSymlog",
  "parseFloat",
  "parseInt",
  "peek",
  "pinchAngle",
  "pinchDistance",
  "pluck",
  "pow",
  "quantileLogNormal",
  "quantileNormal",
  "quantileUniform",
  "quarter",
  "random",
  "range",
  "regexp",
  "replace",
  "reverse",
  "rgb",
  "round",
  "sampleLogNormal",
  "sampleNormal",
  "sampleUniform",
  "scale",
  "screen",
  "seconds",
  "sequence",
  "signal names",
  "sin",
  "slice",
  "slice",
  "span",
  "split",
  "sqrt",
  "substring",
  "tan",
  "test",
  "time",
  "timeFormat",
  "timeOffset",
  "timeParse",
  "timeSequence",
  "timeUnitSpecifier",
  "timezoneoffset",
  "toBoolean",
  "toDate",
  "toNumber",
  "toString",
  "treeAncestors",
  "treePath",
  "trim",
  "truncate",
  "upper",
  "utc",
  "utcFormat",
  "utcOffset",
  "utcParse",
  "utcSequence",
  "utcdate",
  "utcday",
  "utcdayofyear",
  "utchours",
  "utcmilliseconds",
  "utcminutes",
  "utcmonth",
  "utcquarter",
  "utcseconds",
  "utcweek",
  "utcyear",
  "warn",
  "week",
  "windowSize",
  "x",
  "xy",
  "y",
  "year",
  "zoomLinear",
  "zoomLog",
  "zoomPow",
  "zoomSymlog",
];

const termSet = new Set(terms);

const blue = "#0551A5";
const green = "#17885C";
const red = "#A21615";
// const black = "#000";
const colorMap: Record<string, string> = {
  Number: green,
  String: red,
  VariableName: blue,
};

function doSyntaxHighlighting(view: EditorView) {
  const widgets: Range<Decoration>[] = [];
  const code = view.state.doc.sliceString(0);
  parser.parse(code).iterate({
    from: 0,
    to: code.length,
    enter: ({ node, from, to }) => {
      if (colorMap[node.type.name]) {
        const style = `color: ${colorMap[node.type.name]}`;
        const syntaxHighlight = Decoration.mark({ attributes: { style } });
        widgets.push(syntaxHighlight.range(from, to));
      }
    },
  });
  try {
    return Decoration.set(widgets.sort((a, b) => a.from - b.from));
  } catch (e) {
    console.log(e);
    console.log("problem creating widgets");
    return Decoration.set([]);
  }
}

const analogSyntaxHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = doSyntaxHighlighting(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = doSyntaxHighlighting(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);
