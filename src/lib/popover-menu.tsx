import React from "react";
import ReactDOM from "react-dom";

import {
  Prec,
  Extension,
  EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import PopOverMenu from "../components/PopoverMenu";
import { SyntaxNode } from "@lezer/common";

import {
  ViewPlugin,
  PluginValue,
  ViewUpdate,
  KeyBinding,
  keymap,
  EditorView,
  showTooltip,
} from "@codemirror/view";
import { cmStatePlugin } from "./cmState";
import { getMenuTargetNode } from "./utils";

export const setDiagnostics = StateEffect.define<any>();

interface PopoverMenuState {
  showPopover: boolean;
  popOverInUse: boolean;
  targetNode: SyntaxNode | any;
  targetedTypings: [];
  tooltip: any;
}
export const popoverMenuState: PopoverMenuState = {
  showPopover: true,
  popOverInUse: false,
  targetNode: null,
  targetedTypings: [],
  tooltip: null,
};

export const popOverState: StateField<PopoverMenuState> = StateField.define({
  create: () => popoverMenuState,
  update(state, tr) {
    const { schemaTypings } = tr.state.field(cmStatePlugin);
    const targetNode = getMenuTargetNode(tr.state);
    const targetedTypings =
      schemaTypings[`${targetNode.from}-${targetNode.to}`] || [];
    // const possibleTargets = getMenuTargetNode(update.view);
    // console.log(
    //   state,
    //   schemaTypings,
    //   tr,
    //   targetNode,
    //   targetedTypings,
    //   `${targetNode.from}-${targetNode.to}`
    // );
    return {
      ...state,
      targetNode,
      targetedTypings,
      tooltip: completionTooltip(popOverState),
    };
    // return state;
  },
  provide: (f) => {
    return [];
    // return [EditorView.contentAttributes.from(f, (state) => [])];
  },
});

export const PopoverPlugin = ViewPlugin.fromClass(
  class implements PluginValue {
    constructor() {}
    update(update: ViewUpdate) {
      const state = update.view.state;
      const { schemaTypings } = state.field(cmStatePlugin)!;
      //   const possibleTargets = getMenuTargetNode(update.view);
      //   console.log(schemaTypings, update, possibleTargets);
      //   if ()
    }
  },
  {
    eventHandlers: {
      blur() {},
      popStart() {},
      popEnd() {},
    },
  }
);

class CompletionTooltip {
  dom: HTMLElement;
  constructor(
    readonly view: EditorView,
    readonly stateField: StateField<PopoverMenuState>
  ) {
    this.dom = document.createElement("div");
    this.dom.className = "cm-tooltip-autocomplete";
  }

  update() {
    const { schemaTypings, projections } = this.view.state.field(cmStatePlugin);
    console.log("hi");
    const { targetNode } = this.view.state.field(this.stateField);
    if (!targetNode) {
      return;
    }
    const bbox = this.view.coordsAtPos(targetNode.from);
    console.log(bbox);
    //     let
    // if (bbox) {
    //   possibleMenuTargets.push({
    //     x: bbox.left,
    //     y: bbox.top,
    //     node,
    //     from,
    //     to,
    //   });
    const element = React.createElement(PopOverMenu, {
      projections,
      view: this.view,
      syntaxNode: targetNode,
      schemaMap: schemaTypings,
      closeMenu: () => {},
      codeUpdate: () => {},
      xPos: undefined,
      yPos: undefined,
      lints: [],
    });
    // this might be too aggressive a rendering scheme?

    ReactDOM.render(element, this.dom);

    // return wrap;
  }
}

export function completionTooltip(
  stateField: StateField<typeof popoverMenuState>
) {
  // todo should be tooltip view as export?
  return (view: EditorView): any => new CompletionTooltip(view, stateField);
}

export const popOverCompletionKeymap: readonly KeyBinding[] = [
  //   { key: "Ctrl-Space", run: startCompletion },
  //   { key: "Escape", run: closeCompletion },
  //   { key: "ArrowDown", run: moveCompletionSelection(true) },
  //   { key: "ArrowUp", run: moveCompletionSelection(false) },
  //   { key: "PageDown", run: moveCompletionSelection(true, "page") },
  //   { key: "PageUp", run: moveCompletionSelection(false, "page") },
  //   { key: "Enter", run: acceptCompletion },
];

export default function popoverPlugin(): Extension {
  return [
    popOverState,
    PopoverPlugin,
    // this next part might be wrong
    Prec.highest(keymap.computeN([], () => [popOverCompletionKeymap])),
  ];
}
