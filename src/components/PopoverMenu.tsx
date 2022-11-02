import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { EditorView } from "@codemirror/view";
// import { EditorSelection } from "@codemirror/state";
// import isequal from "lodash.isequal";
import { SyntaxNode } from "@lezer/common";
// import * as Json from "jsonc-parser";
import { HotKeys, configure } from "react-hotkeys";
import { useHotkeys } from "react-hotkeys-hook";

import {
  generateMenuContent,
  MenuElement,
  MenuRow,
} from "../lib/compute-menu-contents";
import isEqual from "lodash.isequal";

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

interface RenderMenuElementProps {
  eventDispatch: (menuEvent: MenuEvent) => void;
  //   menuElement: MenuElement;
  menuElement: any;
  selectedRouting: number[];
  elementRouting: number[];
}

function RenderMenuElementDisplay(props: RenderMenuElementProps) {
  return (
    <div
      style={{
        maxHeight: "200px",
        overflowY: "auto",
        fontSize: "13px",
        background: isEqual(props.selectedRouting, props.elementRouting)
          ? "red"
          : "none",
      }}
    >
      <ReactMarkdown>{props.menuElement.content}</ReactMarkdown>
    </div>
  );
}

function RenderMenuElementButton(props: RenderMenuElementProps) {
  return (
    <button
      onClick={() => props.eventDispatch(props.menuElement.onSelect)}
      style={{
        background: isEqual(props.selectedRouting, props.elementRouting)
          ? "red"
          : "none",
      }}
    >
      {props.menuElement.content}
    </button>
  );
}

function RenderMenuElementRow(props: RenderMenuElementProps) {
  const dir = props.menuElement.direction;
  return (
    <div
      style={{
        background: isEqual(props.selectedRouting, props.elementRouting)
          ? "red"
          : "none",
      }}
      className={classNames({
        flex: dir === "horizontal",
        "flex-down": dir === "vertical",
      })}
    >
      {props.menuElement.element.map(
        (menuElement: MenuElement, idx: number) => (
          <RenderMenuElement
            {...props}
            menuElement={menuElement}
            elementRouting={[...props.elementRouting, idx]}
            key={idx}
          />
        )
      )}
    </div>
  );
}

const dispatch: Record<string, (props: RenderMenuElementProps) => JSX.Element> =
  {
    display: RenderMenuElementDisplay,
    button: RenderMenuElementButton,
    row: RenderMenuElementRow,
    projection: (props) => props.menuElement.element,
  };
function RenderMenuElement(props: RenderMenuElementProps): JSX.Element {
  return dispatch[props.menuElement.type](props);
}

// function SpatialDisplayToTree

function traverseContentTreeToNode(
  tree: MenuRow[],
  path: number[]
): MenuElement | MenuRow | null {
  if (!path.length || !tree.length) {
    return null;
  }
  if (path.length === 1) {
    return tree[path[0]];
  }
  //   console.log(tree, path);
  function helper(
    node: MenuElement,
    currentPath: number[]
  ): MenuElement | null {
    // console.log(node, currentPath);
    if (!currentPath.length) {
      return node;
    }
    if (node.type !== "row") {
      return null;
    }
    const [head, ...tail] = currentPath.slice(1);
    return helper(node.element[head], tail);
  }
  // return
  const result = helper(tree[path[0]].element, path.slice(1));
  //   console.log(result);
  return result;
}

function sortContentTree(content: MenuRow[]) {
  const labelWeights: Record<string, number> = {
    content: 2,
    custom: -1,
  };
  return content.sort((a, b) => {
    const aWeight = labelWeights[a.label.toLowerCase()] || 0;
    const bWeight = labelWeights[b.label.toLowerCase()] || 0;
    return bWeight - aWeight;
  });
}

type MoveDirections = "up" | "left" | "right" | "down";
function buildMoveCursor(
  dir: MoveDirections,
  content: MenuRow[],
  route: number[]
): number[] | false {
  const target = traverseContentTreeToNode(content, route);
  const atRoot = route.length === 1;
  const containerDirection = atRoot
    ? "vertical"
    : (
        traverseContentTreeToNode(
          content,
          route.slice(0, route.length - 1)
        ) as any
      ).direction;
  console.log("here", containerDirection, target);
  const atLeaf = !atRoot && (target as MenuElement).type !== "row";
  let maxIndexValue = atRoot ? content.length - 1 : Infinity;
  let newRoute = [...route];
  const tailValue = newRoute[newRoute.length - 1];
  // if (dir === "up") {
  //   if (tailValue - 1 < 0) {
  //     if (newRoute.length > 1) {
  //       newRoute.pop();
  //     } else {
  //       closeMenu();
  //     }
  //   } else {
  //     newRoute[newRoute.length - 1] = tailValue - 1;
  //   }
  // }
  const negativeIndex = tailValue - 1 < 0;
  if (dir === "up" && negativeIndex && newRoute.length > 1) {
    newRoute.pop();
  }
  if (dir === "up" && negativeIndex && !(newRoute.length > 1)) {
    return false;
  }
  if (dir === "up" && !negativeIndex) {
    newRoute[newRoute.length - 1] = tailValue - 1;
  }

  if (dir === "down") {
    newRoute[newRoute.length - 1] = Math.min(tailValue + 1, maxIndexValue);
  }
  if (dir === "left" && !atRoot) {
    newRoute.pop();
  }
  if (dir === "right" && !atLeaf) {
    newRoute.push(0);
  }

  const moveDownTree = false;
  const moveUpTree = false;
  const moveToNextSibling = false;
  const moveToPrevSibling = false;

  //   setSelectedRouting(newRoute);
  return newRoute;
}

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
  const [selectedRouting, setSelectedRouting] = useState<number[]>([]);

  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // console.log("here", syntaxNode);
    if (syntaxNode) {
      container.current!.focus();
      setSelectedRouting([0]);
    } else {
      setSelectedRouting([]);
    }
    // todo on exit refocus
  }, [syntaxNode]);

  const eventDispatch = (menuEvent: MenuEvent) => {
    const update = modifyCodeByCommand(menuEvent, syntaxNode);
    if (update) {
      codeUpdate(update);
    }
  };

  const currentCodeSlice = syntaxNode
    ? codeString(view, syntaxNode.from, syntaxNode.to)
    : "";
  const keyPath = syntaxNode ? syntaxNodeToKeyPath(syntaxNode, view) : [];

  const content: MenuRow[] =
    !syntaxNode || !syntaxNode.parent
      ? []
      : sortContentTree(
          [
            ...generateMenuContent(currentCodeSlice, syntaxNode, schemaMap),
            ...projections
              .filter((proj) => keyPathMatchesQuery(proj.query, keyPath))
              .filter((proj) => proj.type === "tooltip")
              .map((proj) => {
                return {
                  label: "CUSTOM",
                  element: proj.projection({
                    view,
                    node: syntaxNode,
                    keyPath,
                    currentValue: currentCodeSlice,
                  }),
                };
              }),
          ].filter((x) => x.element) as MenuRow[]
        );

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
    }
    // hack
    setTimeout(() => closeMenu(), 30);
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
  const [head, ...tail] = selectedRouting;
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
          {content.map(({ label, element }, idx) => {
            return (
              <div
                className="cm-annotation-widget-popover-container-row"
                key={idx}
              >
                <div
                  className={classNames({
                    "cm-annotation-widget-popover-container-row-label": true,
                    "cm-annotation-widget-element-selected":
                      head === idx && !tail.length,
                  })}
                  onClick={() => setSelectedRouting([idx])}
                >
                  {label}
                </div>
                <RenderMenuElement
                  menuElement={element}
                  eventDispatch={eventDispatch}
                  selectedRouting={selectedRouting}
                  elementRouting={[idx, 0]}
                />
              </div>
            );
          })}
        </div>
      </div>
    </HotKeys>
  );
}
