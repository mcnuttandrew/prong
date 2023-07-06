import { createElement, useEffect, useState } from "react";
import ReactDOM from "react-dom";

import { EditorView, TooltipView } from "@codemirror/view";
import { StateField } from "@codemirror/state";
import { SyntaxNode } from "@lezer/common";
import { filterContents } from "../search";
import { cmStatePlugin } from "../cmState";
import {
  classNames,
  codeString,
  codeStringState,
  getCursorPos,
  simpleUpdate,
} from "../utils";

import { usePersistedState } from "../local-utils";
import { modifyCodeByCommand, MenuEvent } from "../modify-json";

import {
  MenuRow,
  retargetToAppropriateNode,
  simpleMerge,
} from "../compute-menu-contents";

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
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearch] = useState<false | string>(false);
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
    const update = modifyCodeByCommand(
      menuEvent,
      node,
      codeString(view, 0),
      getCursorPos(view.state)
    );
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

  let filteredMenu = searchTerm
    ? filterContents(searchTerm, menuContents)
    : menuContents;
  return (
    <div className={"cm-annotation-menu"}>
      <button
        className="cm-annotation-menu-control cm-annotation-menu-control--bottom"
        onClick={() => closeMenu(true)}
      >
        ↓
      </button>
      <button
        className="cm-annotation-menu-control cm-annotation-menu-control--top"
        onClick={() => setShowSearch(!showSearch)}
      >
        🔍
      </button>
      <div className="cm-annotation-widget-popover-container">
        {showSearch && (
          <div className="cm-annotation-widget-popover--search-bar">
            <span
              className={"cm-annotation-widget-popover-container-row-label"}
            >
              Search bar
            </span>
            <input
              title={"Search bar"}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </div>
        )}
        {filteredMenu.map((row, idx) => (
          <RenderRow
            key={idx}
            row={row}
            selectedRouting={selectedRouting}
            idx={idx}
            setSelectedRouting={setSelectedRouting}
            eventDispatch={eventDispatch}
          />
        ))}
      </div>
    </div>
  );
}

export function RenderRow(props: {
  row: MenuRow;
  selectedRouting: false | SelectionRoute;
  idx: number;
  setSelectedRouting: false | ((newRoute: SelectionRoute) => void);
  eventDispatch: (menuEvent: MenuEvent, shouldCloseMenu?: boolean) => void;
}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedState("cm-menu-pagesize", 20);
  const { row, selectedRouting, idx, setSelectedRouting, eventDispatch } =
    props;
  const { label, elements } = row;
  const initialType = (row.elements as any)?.type;
  const allElementsSameType =
    !!initialType && row.elements.every((x: any) => x?.type === initialType);
  const els = elements || [];
  return (
    <div
      className={classNames({
        "cm-annotation-widget-popover-container-row": true,
        "cm-annotation-widget-element-selected":
          selectedRouting &&
          selectedRouting[0] === idx &&
          selectedRouting[1] === 0,
      })}
    >
      <div
        className={"cm-annotation-widget-popover-container-row-label"}
        onClick={() => setSelectedRouting && setSelectedRouting([idx, 0])}
      >
        {label}
      </div>
      {els.length > 20 && (
        <div className="cm-annotation-widget-popover-container-row-pagination">
          <button onClick={() => setPage(Math.max(0, page - 1))}>Prev</button>
          <span>{`Showing ${pageSize * page} - ${
            pageSize * (page + 1)
          } out of ${els.length}`}</span>
          <span>
            (Page Size{" "}
            <select
              aria-label="page size selector"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((num) => (
                <option value={num} key={num}>
                  {num}
                </option>
              ))}
            </select>
            )
          </span>
          <button
            onClick={() =>
              setPage(Math.min(Math.floor(els.length / pageSize), page + 1))
            }
          >
            Next
          </button>
        </div>
      )}
      <div className="cm-annotation-widget-popover-container-row-content">
        {els
          .slice(page * pageSize, (page + 1) * pageSize)
          .map((element, jdx) => (
            <PopoverMenuElement
              menuElement={element}
              eventDispatch={eventDispatch}
              allElementsInGroupAreOfThisType={allElementsSameType}
              parentGroup={row}
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
    let fullMenuContents = simpleMerge(
      maybeFilterToFullProjection([...menuContents, ...projectionContents])
    );

    const element = createElement(PopOverMenuContents, {
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