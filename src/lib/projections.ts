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
  name: string;
  query: ProjectionQuery;
  projection: (props: ProjectionProps) => JSX.Element;
}

export interface ProjectionTooltip extends ProjectionBase {
  type: "tooltip";
}

export interface ProjectionFullTooltip extends ProjectionBase {
  type: "full-tooltip";
}

export interface ProjectionInline extends ProjectionBase {
  type: "inline";
  hasInternalState: boolean;
  mode: "replace" | "prefix" | "suffix" | "replace-multiline";
}

export type Projection =
  | ProjectionInline
  | ProjectionTooltip
  | ProjectionFullTooltip;

function widgetBuilder(
  projectionsInUse: ProjectionMaterialization[],
  state: EditorState
) {
  const widgets: Range<Decoration>[] = [];
  const { schemaTypings, codeUpdateHook } = state.field(cmStatePlugin);
  // for (const { from, to } of view.visibleRanges) {
  syntaxTree(state).iterate({
    from: 0,
    to: state.doc.length,
    enter: ({ node, from, to, type }) => {
      const currentCodeSlice = codeStringState(state, from, to);
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
  // }
  try {
    return Decoration.set(widgets.sort((a, b) => a.from - b.from));
  } catch (e) {
    console.log(e);
    console.log("problem creating widgets");
    return Decoration.set([]);
  }
}

export const getInUseRanges = (projectionsInUse: ProjectionMaterialization[]) =>
  projectionsInUse.reduce((acc, row) => {
    acc.add(`${row.from}-${row.to}`);
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
  update: (state, tr) =>
    widgetBuilder(
      identifyProjectionLocations(tr.state).multilineLocations,
      tr.state
    ),
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
  return runProjectionQuery(
    projection.query,
    keyPath,
    currentCodeSlice,
    typings,
    syntaxNode.type.name,
    // @ts-ignore
    projection.id
  );
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

function identifyProjectionLocations(state: EditorState) {
  const inlineLocations: ProjectionMaterialization[] = [];
  const multilineLocations: ProjectionMaterialization[] = [];
  const { projections, schemaTypings } = state.field(cmStatePlugin);
  const inlineProjections = projections.filter(
    (proj) => proj.type === "inline"
  ) as ProjectionInline[];
  syntaxTree(state).iterate({
    enter: ({ from, to, node }) => {
      const baseRange = state.selection.ranges[0];
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
            multilineLocations.push({ from, to, projection });
          } else {
            inlineLocations.push({ from, to, projection });
          }
        }
      });
    },
  });
  return { multilineLocations, inlineLocations };
}

export default function projectionPlugin(): Extension {
  return [projectionState, projectionView, multilineProjectionState];
}
