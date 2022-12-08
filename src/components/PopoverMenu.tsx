import React, { useState, useEffect, useRef } from "react";

import { EditorView } from "@codemirror/view";
import { SyntaxNode } from "@lezer/common";
// import { HotKeys, configure } from "react-hotkeys";
import { LintError } from "../../src/lib/Linter";

import {
  generateMenuContent,
  MenuElement,
  MenuRow,
  retargetToAppropriateNode,
} from "../lib/compute-menu-contents";

import {
  keyPathMatchesQuery,
  syntaxNodeToKeyPath,
  modifyCodeByCommand,
  codeString,
  MenuEvent,
  classNames,
} from "../lib/utils";
import { Projection } from "../lib/widgets";
import { SchemaMap } from "./Editor";
import PopoverMenuElement from "./PopoverMenuElement";
import { UpdateDispatch, SelectionRoute } from "../lib/popover-menu";

// hotkeys config
// configure({
//   simulateMissingKeyPressEvents: false,
//   ignoreKeymapAndHandlerChangesByDefault: false,
// });

// const traverseContentTreeToNode: (
//   tree: MenuRow[],
//   path: SelectionRoute
// ) => MenuElement | MenuRow | null = (tree, [row, col]) =>
//   tree[row].elements[col - 1];

const prepProjections =
  (
    view: EditorView,
    node: SyntaxNode,
    keyPath: (string | number)[],
    currentValue: string
  ) =>
  (proj: Projection) => {
    return {
      label: "CUSTOM",
      elements: [
        {
          type: "projection",
          element: proj.projection({
            view,
            node,
            keyPath,
            currentValue,
          }),
        },
      ],
    };
  };

export default function ContentToMenuItem(props: {
  // lints: LintError[];
  // schemaMap: SchemaMap;
  // xPos: number | undefined;
  // yPos: number | undefined;
  closeMenu: () => void;
  codeUpdate: (codeUpdate: UpdateDispatch) => void;
  menuContents: MenuRow[];
  projections: Projection[];
  selectedRouting: SelectionRoute;
  setSelectedRouting: (route: SelectionRoute) => void;
  syntaxNode: SyntaxNode;
  view: EditorView;
}) {
  const {
    // xPos,
    // yPos,
    closeMenu,
    codeUpdate,
    // lints,
    // projections,
    // schemaMap,
    menuContents,
    selectedRouting,
    setSelectedRouting,
    syntaxNode,
    view,
  } = props;
  const node = syntaxNode && retargetToAppropriateNode(syntaxNode);
  // TODO lift this into the widget
  // const [selectedRouting, setSelectedRouting] = useState<SelectionRoute>([
  //   0, 0,
  // ]);
  // const [content, setContent] = useState<MenuRow[]>([]);

  // const container = useRef<HTMLDivElement>(null);
  // useEffect(() => {
  //   if (syntaxNode) {
  //     container.current!.focus();
  //     setSelectedRouting([0, 0]);
  //   }
  //   // todo on exit refocus
  // }, [syntaxNode]);

  // const currentCodeSlice = syntaxNode
  //   ? codeString(view, syntaxNode.from, syntaxNode.to)
  //   : "";
  // const keyPath = syntaxNode ? syntaxNodeToKeyPath(syntaxNode, view) : [];

  const eventDispatch = (menuEvent: MenuEvent, shouldCloseMenu?: boolean) => {
    const update = modifyCodeByCommand(menuEvent, node, codeString(view, 0));
    if (update) {
      codeUpdate(update);
      // if (shouldCloseMenu) {
      //   closeMenu();
      // }
    }
  };

  // useEffect(() => {
  //   if (!(syntaxNode && syntaxNode.parent)) {
  //     return;
  //   }
  //   setContent([
  //     ...generateMenuContent(currentCodeSlice, syntaxNode, schemaMap),
  //     ...projections
  //       .filter((proj) => keyPathMatchesQuery(proj.query, keyPath))
  //       .filter((proj) => proj.type === "tooltip")
  //       .map(prepProjections(view, syntaxNode, keyPath, currentCodeSlice)),
  //     ...lints.map((lint) => ({
  //       label: "LINT ERROR",
  //       elements: [{ type: "display", content: lint.message }],
  //     })),
  //   ] as MenuRow[]);
  //   // eslint-disable-next-line
  // }, [syntaxNode, schemaMap, lints]);

  // function selectCurrentElement() {
  //   let target = traverseContentTreeToNode(menuContents, selectedRouting);
  //   if (!target) {
  //     return;
  //   }
  //   if ((target as MenuRow).label) {
  //     return;
  //   }
  //   target = target as MenuElement;
  //   if (target.type === "button") {
  //     eventDispatch(target.onSelect);
  //     // hack
  //     setTimeout(() => closeMenu(), 30);
  //   }
  // }

  // const keyMap = {
  //   moveLeft: "left",
  //   moveRight: "right",
  //   moveDown: "down",
  //   moveUp: "up",
  //   closeMenu: "escape",
  //   selectCurrentElement: "enter",
  // };

  // function moveCursor(dir: MoveDirections) {
  //   const computedRoute = buildMoveCursor(dir, content, selectedRouting);
  //   if (!computedRoute) {
  //     closeMenu();
  //     return;
  //   }
  //   setSelectedRouting(computedRoute);
  // }

  // const handlers = {
  //   moveLeft: () => moveCursor("left"),
  //   moveRight: () => moveCursor("right"),
  //   moveDown: () => moveCursor("down"),
  //   moveUp: () => moveCursor("up"),
  //   selectCurrentElement: () => selectCurrentElement(),
  //   closeMenu,
  // };

  //   <HotKeys
  //     className=""
  //     keyMap={keyMap}
  //     handlers={handlers}
  //     allowChanges={true}
  //     // innerRef={container}
  //   >
  return (
    <div>
      {/* {syntaxNode && (
        <div className="cm-annotation-menu-bg" onClick={() => closeMenu()} />
      )} */}
      <div
        className="cm-annotation-menu position-absolute"
        onClick={(e: any) => {
          //   click on the menu to retarget it
          // if (new Set([...e.target.classList]).has("cm-annotation-menu")) {
          //   container.current!.focus();
          // }
          // style={
          //   syntaxNode
          //     ? {
          //         top: yPos! + 20,
          //         left: xPos,
          //         // transform: `translate(${xPos}px, ${yPos}px)`,
          //       }
          //     : { display: "none" }
          // }
        }}
      >
        <div className="cm-annotation-widget-popover-container">
          {menuContents.map((row, idx) => {
            const { label, elements } = row;
            return (
              <div
                className="cm-annotation-widget-popover-container-row"
                key={idx}
              >
                <div
                  className={classNames({
                    "cm-annotation-widget-popover-container-row-label": true,
                    "cm-annotation-widget-element-selected":
                      selectedRouting[0] === idx && selectedRouting[1] === 0,
                  })}
                  onClick={() => setSelectedRouting([idx, 0])}
                >
                  {label}
                </div>
                <div className="cm-annotation-widget-popover-container-row-content">
                  {(elements || []).map((element, jdx) => (
                    <PopoverMenuElement
                      menuElement={element}
                      eventDispatch={eventDispatch}
                      isSelected={
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
      {/* </HotKeys> */}
    </div>
  );
}
