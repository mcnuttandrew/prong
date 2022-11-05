import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { EditorView } from "@codemirror/view";
import { SyntaxNode } from "@lezer/common";
import { HotKeys, configure } from "react-hotkeys";

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
import { SchemaMap, UpdateDispatch } from "./Editor";

// hotkeys config
configure({
  simulateMissingKeyPressEvents: false,
});

interface MenuProps {
  projections: Projection[];
  view: EditorView;
  syntaxNode: SyntaxNode;
  schemaMap: SchemaMap;
  closeMenu: () => void;
  codeUpdate: (codeUpdate: UpdateDispatch) => void;
  xPos: number | undefined;
  yPos: number | undefined;
}

type SelectionRoute = [number, number];

type MenuElementRenderer<T> = (props: {
  eventDispatch: (menuEvent: MenuEvent, shouldCloseMenu?: boolean) => void;
  // TODO fix this type;
  menuElement: T;
  isSelected: boolean;
}) => JSX.Element;

const RenderMenuElementDisplay: MenuElementRenderer<any> = (props) => (
  <div
    style={{
      maxHeight: "200px",
      overflowY: "auto",
      fontSize: "13px",
      background: props.isSelected ? "red" : "none",
    }}
  >
    <ReactMarkdown>{props.menuElement.content}</ReactMarkdown>
  </div>
);

const RenderMenuElementButton: MenuElementRenderer<any> = (props) => (
  <button
    onClick={() => props.eventDispatch(props.menuElement.onSelect, true)}
    style={{
      background: props.isSelected ? "red" : "none",
    }}
  >
    {props.menuElement.content}
  </button>
);

const dispatch: Record<string, MenuElementRenderer<any>> = {
  display: RenderMenuElementDisplay,
  button: RenderMenuElementButton,
  projection: (props) => props.menuElement.element,
};
const RenderMenuElement: MenuElementRenderer<any> = (props) => {
  return dispatch[props.menuElement.type](props);
};

const traverseContentTreeToNode: (
  tree: MenuRow[],
  path: SelectionRoute
) => MenuElement | MenuRow | null = (tree, [row, col]) =>
  tree[row].elements[col - 1];

type MoveDirections = "up" | "left" | "right" | "down";
function buildMoveCursor(
  dir: MoveDirections,
  content: MenuRow[],
  route: SelectionRoute
): SelectionRoute | false {
  let row = route[0];
  let col = route[1];
  console.log("XX", route, content);
  const leafGroupSize = content[row].elements?.length;
  const numRows = content.length;

  if (dir === "up" && row - 1 < 0) {
    return false;
  }
  if (dir === "up" && row - 1 >= 0) {
    row -= 1;
    col = 0;
  }
  if (dir === "down" && row < numRows) {
    row += 1;
    col = 0;
  }
  if (dir === "left") {
    col = Math.max(col - 1, 0);
  }
  if (dir === "right") {
    col = Math.min(col + 1, leafGroupSize);
  }

  return [row, col];
}

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

export default function ContentToMenuItem(props: MenuProps) {
  const {
    schemaMap,
    projections,
    view,
    syntaxNode,
    codeUpdate,
    closeMenu,
    xPos,
    yPos,
  } = props;
  const node = syntaxNode && retargetToAppropriateNode(syntaxNode);
  const [selectedRouting, setSelectedRouting] = useState<SelectionRoute>([
    0, 0,
  ]);
  const [content, setContent] = useState<MenuRow[]>([]);

  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (syntaxNode) {
      container.current!.focus();
      setSelectedRouting([0, 0]);
    }
    // todo on exit refocus
  }, [syntaxNode]);

  const eventDispatch = (menuEvent: MenuEvent, shouldCloseMenu?: boolean) => {
    const update = modifyCodeByCommand(menuEvent, node);
    if (update) {
      codeUpdate(update);
      if (shouldCloseMenu) {
        closeMenu();
      }
    }
  };

  const currentCodeSlice = syntaxNode
    ? codeString(view, syntaxNode.from, syntaxNode.to)
    : "";
  const keyPath = syntaxNode ? syntaxNodeToKeyPath(syntaxNode, view) : [];

  useEffect(() => {
    console.log("ere");
    if (!(syntaxNode && syntaxNode.parent)) {
      return;
    }
    setContent([
      ...generateMenuContent(currentCodeSlice, syntaxNode, schemaMap),
      ...projections
        .filter((proj) => keyPathMatchesQuery(proj.query, keyPath))
        .filter((proj) => proj.type === "tooltip")
        .map(prepProjections(view, syntaxNode, keyPath, currentCodeSlice)),
    ] as MenuRow[]);
  }, [syntaxNode, schemaMap]);

  function selectCurrentElement() {
    let target = traverseContentTreeToNode(content, selectedRouting);
    if (!target) {
      return;
    }
    if ((target as MenuRow).label) {
      return;
    }
    target = target as MenuElement;
    if (target.type === "button") {
      eventDispatch(target.onSelect);
      // hack
      setTimeout(() => closeMenu(), 30);
    }
  }

  const keyMap = {
    moveLeft: "left",
    moveRight: "right",
    moveDown: "down",
    moveUp: "up",
    closeMenu: "escape",
    selectCurrentElement: "enter",
  };

  function moveCursor(dir: MoveDirections) {
    const computedRoute = buildMoveCursor(dir, content, selectedRouting);
    if (!computedRoute) {
      closeMenu();
      return;
    }
    setSelectedRouting(computedRoute);
  }

  const handlers = {
    moveLeft: () => moveCursor("left"),
    moveRight: () => moveCursor("right"),
    moveDown: () => moveCursor("down"),
    moveUp: () => moveCursor("up"),
    selectCurrentElement: () => selectCurrentElement(),
    closeMenu: () => {
      closeMenu();
    },
  };
  //   traverseContentTreeToNode(content, selectedRouting);

  //   TODO figure out a signal for when hotkeys are finished rebinding, add a loader to support
  return (
    <HotKeys
      keyMap={keyMap}
      handlers={handlers}
      allowChanges={true}
      innerRef={container}
    >
      {syntaxNode && (
        <div className="cm-annotation-menu-bg" onClick={() => closeMenu()} />
      )}
      <div
        className="cm-annotation-menu"
        onClick={(e: any) => {
          //   click on the menu to retarget it
          if (new Set([...e.target.classList]).has("cm-annotation-menu")) {
            container.current!.focus();
          }
        }}
        style={
          syntaxNode ? { top: yPos! - 30, left: xPos } : { display: "none" }
        }
      >
        <div className="cm-annotation-widget-popover-container">
          {content.map((row, idx) => {
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
                    <RenderMenuElement
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
    </HotKeys>
  );
}
