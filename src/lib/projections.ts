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

import { codeString, syntaxNodeToKeyPath, codeStringState } from "./utils";
import { runProjectionQuery, ProjectionQuery } from "./query";
import { cmStatePlugin } from "./cmState";

import InlineProjectWidgetFactory from "./widgets/inline-projection-widget";

export interface ProjectionProps {
  node: SyntaxNode;
  keyPath: (string | number)[];
  currentValue: any;
  setCode: (code: string) => void;
  fullCode: string;
}

interface ProjectionBase {
  name: string;
  query: ProjectionQuery;
  projection: (props: ProjectionProps) => JSX.Element;
}

export interface ProjectionTooltip extends ProjectionBase {
  type: "tooltip";
}

export interface ProjectionInline extends ProjectionBase {
  type: "inline";
  hasInternalState: boolean;
  mode: "replace" | "prefix" | "suffix";
}

export type Projection = ProjectionInline | ProjectionTooltip;

function createWidgets(view: EditorView) {
  const widgets: Range<Decoration>[] = [];
  const { projectionsInUse } = view.state.field(projectionState);

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: ({ node, from, to, type }) => {
        const currentCodeSlice = codeString(view, from, to);
        projectionsInUse
          .filter((x) => x.from === from && x.to === to)
          .forEach((projection) => {
            const projWidget = InlineProjectWidgetFactory(
              projection.projection as ProjectionInline,
              currentCodeSlice,
              node
            );

            projWidget
              .addNode(view, from, to, node)
              .forEach((w) => widgets.push(w));
          });
      },
    });
  }
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
      this.decorations = createWidgets(view);
    }

    update(update: ViewUpdate) {
      const stateValuesChanged = !isEqual(
        update.startState.field(projectionState),
        update.state.field(projectionState)
      );
      if (update.viewportChanged || stateValuesChanged) {
        this.decorations = createWidgets(update.view);
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
      projectionsInUse: identifyProjectionLocations(tr.state),
    };
  },
});

function shouldAddProjection(
  syntaxNode: SyntaxNode,
  state: EditorState,
  projection: Projection
) {
  const keyPath = syntaxNodeToKeyPath(syntaxNode, codeStringState(state, 0));
  const currentCodeSlice = codeStringState(
    state,
    syntaxNode.from,
    syntaxNode.to
  );
  return runProjectionQuery(projection.query, keyPath, currentCodeSlice);
}

function identifyProjectionLocations(state: EditorState) {
  const locations: ProjectionMaterialization[] = [];
  const { projections } = state.field(cmStatePlugin);
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

        if (shouldAddProjection(node, state, projection)) {
          locations.push({ from, to, projection });
        }
      });
    },
  });
  return locations;
}

export default function projectionPlugin(): Extension {
  return [projectionState, projectionView];
}
