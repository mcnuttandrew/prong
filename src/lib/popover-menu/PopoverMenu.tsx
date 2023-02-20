import React, { useEffect } from "react";
import ReactDOM from "react-dom";

import { EditorView, TooltipView } from "@codemirror/view";
import { StateField } from "@codemirror/state";
import { SyntaxNode } from "@lezer/common";

import { cmStatePlugin } from "../cmState";
import {
  simpleUpdate,
  codeString,
  classNames,
  codeStringState,
} from "../utils";

import { modifyCodeByCommand, MenuEvent } from "../modify-json";

import { MenuRow, retargetToAppropriateNode } from "../compute-menu-contents";

import { Projection } from "../projections";
import PopoverMenuElement from "./PopoverMenuElement";
import {
  UpdateDispatch,
  SelectionRoute,
  setRouting,
  popoverEffectDispatch,
  PopoverMenuState,
  buildProjectionsForMenu,
  visibleStates,
  maybeFilterToFullProjection,
} from "./PopoverState";

function PopOverMenuContents(props: {
  closeMenu: (hardClose?: boolean) => void;
  codeUpdate: (codeUpdate: UpdateDispatch) => void;
  menuContents: MenuRow[];
  projections: Projection[];
  selectedRouting: false | SelectionRoute;
  setSelectedRouting: (route: SelectionRoute) => void;
  syntaxNode: SyntaxNode;
  view: EditorView;
}) {
  const {
    closeMenu,
    codeUpdate,
    menuContents,
    selectedRouting,
    setSelectedRouting,
    syntaxNode,
    view,
  } = props;
  const node = syntaxNode && retargetToAppropriateNode(syntaxNode);

  const eventDispatch = (menuEvent: MenuEvent, shouldCloseMenu?: boolean) => {
    const update = modifyCodeByCommand(menuEvent, node, codeString(view, 0));
    if (update) {
      codeUpdate(update);
    }
    if (update && shouldCloseMenu) {
      closeMenu();
    }
  };

  useEffect(() => {
    if (!selectedRouting) {
      return;
    }
    const num = selectedRouting[0] + 1;
    const node = ReactDOM.findDOMNode(
      document.querySelector(
        `.cm-annotation-widget-popover-container > :nth-child(${num})`
      )
    );

    if (node) {
      (node as Element).scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [selectedRouting]);

  return (
    <div className={"cm-annotation-menu"}>
      <button
        className="cm-annotation-menu-control"
        onClick={() => closeMenu(true)}
      >
        ↓
      </button>
      <div className="cm-annotation-widget-popover-container">
        {menuContents.map((row, idx) => {
          const { label, elements } = row;
          const initialType = (row.elements as any)?.type;
          const allElementsSameType =
            !!initialType &&
            row.elements.every((x: any) => x?.type === initialType);
          return (
            <div
              className={classNames({
                "cm-annotation-widget-popover-container-row": true,
                "cm-annotation-widget-element-selected":
                  selectedRouting &&
                  selectedRouting[0] === idx &&
                  selectedRouting[1] === 0,
              })}
              key={idx}
            >
              <div
                className={"cm-annotation-widget-popover-container-row-label"}
                onClick={() => setSelectedRouting([idx, 0])}
              >
                {label}
              </div>
              <div className="cm-annotation-widget-popover-container-row-content">
                {(elements || []).map((element, jdx, arr) => (
                  <PopoverMenuElement
                    menuElement={element}
                    eventDispatch={eventDispatch}
                    allElementsInGroupAreOfThisType={allElementsSameType}
                    isSelected={
                      selectedRouting &&
                      selectedRouting[0] === idx &&
                      selectedRouting[1] === jdx + 1
                    }
                    key={jdx}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

class Tooltip {
  dom: HTMLElement;
  constructor(
    readonly view: EditorView,
    readonly stateField: StateField<PopoverMenuState>
  ) {
    this.dom = document.createElement("div");
    this.dom.className = "cm-tooltip-autocomplete";
    this.update();
  }

  update() {
    const { projections } = this.view.state.field(cmStatePlugin);
    const {
      targetNode,
      menuState,
      selectedRouting,
      menuContents,
      hasProjectionContent,
    } = this.view.state.field(this.stateField);

    const popoverNotVisible = !visibleStates.has(menuState);
    if (
      !targetNode ||
      targetNode.type.name === "JsonText" ||
      popoverNotVisible ||
      (!menuContents.length && !hasProjectionContent)
    ) {
      ReactDOM.unmountComponentAtNode(this.dom);
      return;
    }
    // TODO add a bunch of guards to see if equivalent inputs have actually changed or not

    const codeUpdate = (codeUpdate: UpdateDispatch) => {
      simpleUpdate(this.view, codeUpdate.from, codeUpdate.to, codeUpdate.value);
    };
    const closeMenu = (hardClose?: boolean) =>
      this.view.dispatch({
        effects: [popoverEffectDispatch.of(hardClose ? "forceClose" : "close")],
      });

    const setSelectedRouting = (route: [number, number]) => {
      this.view.dispatch({ effects: [setRouting.of(route)] });
    };

    const currentCodeSlice = codeStringState(
      this.view.state,
      targetNode.from,
      targetNode.to
    );

    const fullCode = this.view.state.doc.toString();
    const projectionContents = buildProjectionsForMenu({
      fullCode,
      currentCodeSlice,
      node: targetNode,
      view: this.view,
      state: this.view.state,
    });

    // todo use this cache
    let fullMenuContents = maybeFilterToFullProjection([
      ...menuContents,
      ...projectionContents,
    ]);

    const element = React.createElement(PopOverMenuContents, {
      closeMenu,
      codeUpdate,
      menuContents: fullMenuContents,
      projections,
      selectedRouting: menuState === "inUse" ? selectedRouting : false,
      setSelectedRouting,
      syntaxNode: targetNode,
      view: this.view,
    });
    // this might be too aggressive a rendering scheme?

    ReactDOM.render(element, this.dom);
  }
}

export default function createTooltip(
  stateField: StateField<PopoverMenuState>
) {
  return (view: EditorView): TooltipView => {
    return new Tooltip(view, stateField);
  };
}
