/* eslint-disable no-loop-func */
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { StateField, EditorState, Extension } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { SyntaxNode } from "@lezer/common";
import { Range } from "@codemirror/state";
import isEqual from "lodash.isequal";
import { popOverState } from "./popover-menu/PopoverState";

import { syntaxNodeToKeyPath, codeStringState } from "./utils";
import { runProjectionQuery, ProjectionQuery } from "./query";
import { cmStatePlugin } from "./cmState";

import InlineProjectWidgetFactory from "./widgets/inline-projection-widget";
import { Diagnostic } from "@codemirror/lint";

export interface ProjectionProps {
  node: SyntaxNode;
  keyPath: (string | number)[];
  currentValue: any;
  setCode: (code: string) => void;
  fullCode: string;
  typings: any[];
  diagnosticErrors: Diagnostic[];
  cursorPositions: any[];
}

interface ProjectionBase {
  query: ProjectionQuery;
  projection: (props: ProjectionProps) => JSX.Element;
}

export interface ProjectionTooltip extends ProjectionBase {
  type: "tooltip";
  name: string;
}

// am: should tooltip and full-tooltip merge and have a mode?
export interface ProjectionFullTooltip extends ProjectionBase {
  type: "full-tooltip";
  name: string;
}

export interface ProjectionInline extends ProjectionBase {
  type: "inline";
  hasInternalState: boolean;
  // am should replace and replace-multiline combine?
  mode: "replace" | "prefix" | "suffix" | "replace-multiline";
}

export interface ProjectionHighlight {
  type: "highlight";
  query: ProjectionQuery;
  class: string;
}

export type Projection =
  | ProjectionInline
  | ProjectionTooltip
  | ProjectionFullTooltip
  | ProjectionHighlight;

function widgetBuilder(
  projectionsInUse: ProjectionMaterialization[],
  state: EditorState
) {
  const widgets: Range<Decoration>[] = [];
  const { schemaTypings, codeUpdateHook } = state.field(cmStatePlugin);
  const logger = new Set();
  syntaxTree(state).iterate({
    from: 0,
    to: state.doc.length,
    enter: ({ node, from, to, type }) => {
      const currentCodeSlice = codeStringState(state, from, to);
      logger.add(`${from}-${to}`);
      projectionsInUse
        .filter((x) => x.from === from && x.to === to)
        .forEach((projection) => {
          const projWidget = InlineProjectWidgetFactory(
            projection.projection as ProjectionInline,
            currentCodeSlice,
            node,
            schemaTypings[`${node.from}-${node.to}`],
            codeUpdateHook
          );

          projWidget
            .addNode(state, from, to, node)
            .forEach((w) => widgets.push(w));
        });
    },
  });

  try {
    const result = Decoration.set(widgets.sort((a, b) => a.from - b.from));
    return result;
  } catch (e) {
    console.log(e);
    console.log("problem creating widgets");
    return Decoration.set([]);
  }
}

export const getInUseRanges = (projectionsInUse: ProjectionMaterialization[]) =>
  projectionsInUse.reduce((acc, row) => {
    if (
      row.projection.type === "inline" &&
      (row.projection.mode === "replace" ||
        row.projection.mode === "replace-multiline")
    ) {
      acc.add(`${row.from}-${row.to}`);
    }
    return acc;
  }, new Set<`${number}-${number}`>());

export const projectionView = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      const { projectionsInUse } = view.state.field(projectionState);
      this.decorations = widgetBuilder(projectionsInUse, view.state);
    }

    update(update: ViewUpdate) {
      const stateValuesChanged = !isEqual(
        update.startState.field(projectionState),
        update.state.field(projectionState)
      );
      if (update.viewportChanged || stateValuesChanged) {
        const { projectionsInUse } = update.view.state.field(projectionState);
        this.decorations = widgetBuilder(projectionsInUse, update.view.state);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

type ProjectionMaterialization = {
  from: number;
  to: number;
  projection: Projection;
};
export interface ProjectionState {
  projectionsInUse: ProjectionMaterialization[];
}
const initialProjectionState: ProjectionState = {
  projectionsInUse: [],
};

export const projectionState: StateField<ProjectionState> = StateField.define({
  create: () => initialProjectionState,
  update(state, tr) {
    // todo, this may be too broad?
    return {
      ...state,
      projectionsInUse: identifyProjectionLocations(tr.state).inlineLocations,
    };
  },
});

const multilineProjectionState: StateField<DecorationSet> = StateField.define({
  create: () => Decoration.none,
  update: (state, tr) => {
    const locations = identifyProjectionLocations(tr.state).multilineLocations;
    return widgetBuilder(locations, tr.state);
  },
  provide: (f) => EditorView.decorations.from(f),
});

function shouldAddProjectionPreGuard(
  syntaxNode: SyntaxNode,
  state: EditorState,
  projection: Projection,
  typings: any[]
) {
  const keyPath = syntaxNodeToKeyPath(syntaxNode, codeStringState(state, 0));
  const currentCodeSlice = codeStringState(
    state,
    syntaxNode.from,
    syntaxNode.to
  );

  const result = runProjectionQuery(
    projection.query,
    keyPath,
    currentCodeSlice,
    typings,
    syntaxNode.type.name,
    // @ts-ignore
    projection.id
  );
  return result;
}

const shouldAddProjection: typeof shouldAddProjectionPreGuard = (...args) => {
  try {
    return shouldAddProjectionPreGuard(...args);
  } catch (e) {
    console.error(e);
    console.log("ERROR ARGS", args);
    return false;
  }
};

function identifyProjectionLocationsPreCache(state: EditorState) {
  const inlineLocations: ProjectionMaterialization[] = [];
  const multilineLocations: ProjectionMaterialization[] = [];
  const { projections, schemaTypings } = state.field(cmStatePlugin);
  const inlineProjections = projections.filter(
    (proj) => proj.type === "inline"
  ) as ProjectionInline[];
  syntaxTree(state).iterate({
    enter: ({ from, to, node }) => {
      if (node.node.type.name === "⚠") {
        return;
      }
      const baseRange = state.selection.ranges[0];
      let blockChildren = false;
      inlineProjections.forEach((projection) => {
        const isReplace = projection.mode === "replace";
        if (
          isReplace &&
          !projection.hasInternalState &&
          baseRange &&
          baseRange.from >= from &&
          baseRange.from <= to
        ) {
          return;
        }
        const typings = schemaTypings[`${node.from}-${node.to}`];
        if (shouldAddProjection(node, state, projection, typings)) {
          if (projection.mode === "replace-multiline") {
            blockChildren = true;
            multilineLocations.push({ from, to, projection });
          } else {
            if (isReplace) {
              blockChildren = true;
            }
            inlineLocations.push({ from, to, projection });
          }
        }
      });
      if (blockChildren) {
        return false;
      }
    },
  });
  return { multilineLocations, inlineLocations };
}

let cachedResult: any = { multilineLocations: [], inlineLocations: [] };

const getters: Record<string, (state: EditorState) => any> = {
  code: (state) => codeStringState(state, 0),
  targetNode: (state) => {
    const node = state.field(popOverState).targetNode;
    return `${node?.from || 0}-${node?.to || 0}`;
  },
  // targetRange: (state) => state.selection.ranges[0],
  projections: (state) => state.field(cmStatePlugin).projections,
  schemaTypings: (state) =>
    Object.keys(state.field(cmStatePlugin).schemaTypings),
  // treeSize: (state) => syntaxTree(state).length,
};
let cacheKey = Object.fromEntries(
  Object.values(getters).map((x) => [x, undefined])
);
function identifyProjectionLocations(state: EditorState) {
  const newCache = Object.fromEntries(
    Object.entries(getters).map(([key, getter]) => [key, getter(state)])
  );
  const logger: Record<string, boolean> = {};
  const cacheEqual = Object.keys(newCache).every((key) => {
    const result = isEqual(newCache[key], cacheKey[key]);
    logger[key] = result;
    return result;
  });
  if (cacheEqual) {
    return cachedResult;
  }
  const result = identifyProjectionLocationsPreCache(state);
  cachedResult = result;
  cacheKey = newCache;
  return result;
}

export default function projectionPlugin(): Extension {
  return [projectionState, projectionView, multilineProjectionState];
}
