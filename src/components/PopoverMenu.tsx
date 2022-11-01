import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { EditorView } from "@codemirror/view";
// import { EditorSelection } from "@codemirror/state";
// import isequal from "lodash.isequal";
import { SyntaxNode } from "@lezer/common";
// import * as Json from "jsonc-parser";
import { HotKeys } from "react-hotkeys";
import { useHotkeys } from "react-hotkeys-hook";
import { generateMenuContent, MenuElement } from "../lib/compute-menu-contents";

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

interface MenuProps {
  projections: Projection[];
  view: EditorView;
  syntaxNode: SyntaxNode;
  schemaMap: SchemaMap;
  closeMenu: () => void;
  codeUpdate: (codeUpdate: UpdateDispatch) => void;
}

interface RenderMenuElementProps {
  eventDispatch: (menuEvent: MenuEvent) => void;
  //   menuElement: MenuElement;
  menuElement: any;
  selectedRouting: number[];
}

function RenderMenuElementDisplay(props: RenderMenuElementProps) {
  return (
    <div style={{ maxHeight: "200px", overflowY: "auto", fontSize: "13px" }}>
      <ReactMarkdown>{props.menuElement.content}</ReactMarkdown>
    </div>
  );
}

function RenderMenuElementButton(props: RenderMenuElementProps) {
  return (
    <button onClick={() => props.eventDispatch(props.menuElement.onSelect)}>
      {props.menuElement.content}
    </button>
  );
}

function RenderMenuElementRow(props: RenderMenuElementProps) {
  const dir = props.menuElement.direction;
  return (
    <div
      className={classNames({
        flex: dir === "horizontal",
        "flex-down": dir === "vertical",
      })}
    >
      {props.menuElement.element.map(
        (menuElement: MenuElement, idx: number) => (
          <RenderMenuElement {...props} menuElement={menuElement} key={idx} />
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
  //   console.log(props);
  return dispatch[props.menuElement.type](props);
}

export default function ContentToMenuItem(props: MenuProps) {
  const { schemaMap, projections, view, syntaxNode, codeUpdate, closeMenu } =
    props;
  const [selectedRouting, setSelectedRouting] = useState<number[]>([0]);

  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (syntaxNode) {
      container.current?.focus();
    }
    // todo on exit refocus
  }, [syntaxNode]);

  const eventDispatch = (menuEvent: MenuEvent) => {
    const update = modifyCodeByCommand(
      menuEvent,
      // parsedContent,
      syntaxNode
      // currentCodeSlice
    );
    if (update) {
      codeUpdate(update);
    }
  };

  const currentCodeSlice = syntaxNode
    ? codeString(view, syntaxNode.from, syntaxNode.to)
    : "";
  const keyPath = syntaxNode ? syntaxNodeToKeyPath(syntaxNode, view) : [];

  const content =
    !syntaxNode || !syntaxNode.parent
      ? []
      : [
          ...generateMenuContent(view, syntaxNode, schemaMap),
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
        ].filter((x) => x.element);
  function moveCursor(dir: "up" | "left" | "right" | "down") {
    let newRoute = [...selectedRouting];
    console.log(dir, selectedRouting);
    if (dir === "up") {
      if (newRoute[newRoute.length - 1] - 1 < 0) {
        if (newRoute.length > 1) {
          newRoute.pop();
        } else {
          closeMenu();
        }
      } else {
        newRoute[newRoute.length - 1] -= 1;
      }
    }
    if (dir === "down") {
      newRoute[newRoute.length - 1] += 1;
    }
    if (dir === "left" && newRoute.length > 1) {
      newRoute.pop();
    }
    if (dir === "right") {
      newRoute.push(0);
    }
    setSelectedRouting(newRoute);
  }

  const keyMap = {
    moveLeft: "left",
    moveRight: "right",
    moveDown: "down",
    moveUp: "up",
    closeMenu: "escape",
  };

  const handlers = {
    moveLeft: () => moveCursor("left"),
    moveRight: () => moveCursor("right"),
    moveDown: () => moveCursor("down"),
    moveUp: () => moveCursor("up"),
    closeMenu: () => {
      console.log("here???", selectedRouting);
      closeMenu();
    },
  };
  const [head, ...tail] = selectedRouting;
  return (
    <HotKeys keyMap={keyMap} handlers={handlers} allowChanges={true}>
      <div
        className={classNames({
          "cm-annotation-widget-popover-container": true,
        })}
      >
        <div ref={container} tabIndex={0}></div>
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
              >
                {label}
              </div>
              <RenderMenuElement
                menuElement={element}
                key={`${idx}-xxx`}
                eventDispatch={eventDispatch}
                selectedRouting={tail}
              />
            </div>
          );
        })}
      </div>
    </HotKeys>
  );
}
