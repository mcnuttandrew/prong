import * as React from "react";
import { useState, useEffect } from "react";
import * as ReactDOM from "react-dom";
import { Extension } from "@codemirror/state";
import { EditorView, showPanel, Panel } from "@codemirror/view";
import {
  popOverState,
  popoverEffectDispatch,
} from "./popover-menu/PopoverState";
import { MenuRow, retargetToAppropriateNode } from "./compute-menu-contents";
import PopoverMenuElement from "./popover-menu/PopoverMenuElement";
import { MenuEvent, modifyCodeByCommand } from "./modify-json";
import { codeString, simpleUpdate } from "./utils";

function RenderPopoverDocked(props: {
  buildTriggerRerender: (
    binder: (props: {
      menuContents: MenuRow[];
      eventDispatch: any;
      docked: boolean;
      setDock: (setToDocked: boolean) => void;
    }) => void
  ) => void;
}) {
  const { buildTriggerRerender } = props;
  const [menuContents, setMenuContents] = useState<MenuRow[]>([]);
  const [eventDispatch, setEventDispatch] = useState<
    (e: MenuEvent, shouldClose?: boolean) => void
  >(() => {});
  const [docked, setDockedState] = useState(false);
  const [setDock, bindSetDock] = useState<(setToDocked: boolean) => void>(
    () => {}
  );
  useEffect(() => {
    buildTriggerRerender((props) => {
      setDockedState(props.docked);
      setMenuContents(props.menuContents);
      setEventDispatch(props.eventDispatch);
      bindSetDock(props.setDock);
    });
  }, [buildTriggerRerender]);

  // todo also support other actions from the dock
  return (
    <div className="cm-dock">
      <div className="cm-dock-label">
        {!docked && (
          <div>
            Press Escape to dock the menu or{" "}
            {setDock && (
              <button onClick={() => setDock(true)}>click here↓</button>
            )}
          </div>
        )}
        {docked && (
          <div>
            Press CMD+. to undock the menu or{" "}
            {setDock && (
              <button onClick={() => setDock(false)}>click here↑</button>
            )}
          </div>
        )}
      </div>
      {menuContents.map((row, idx) => {
        const { label, elements } = row;
        const initialType = (row.elements as any)?.type;
        const allElementsSameType =
          !!initialType &&
          row.elements.every((x: any) => x?.type === initialType);
        return (
          <div
            className={"cm-annotation-widget-popover-container-row"}
            key={idx}
          >
            <div className={"cm-annotation-widget-popover-container-row-label"}>
              {label}
            </div>
            <div className="cm-annotation-widget-popover-container-row-content">
              {(elements || []).map((element, jdx, arr) => (
                <PopoverMenuElement
                  menuElement={element}
                  eventDispatch={eventDispatch}
                  allElementsInGroupAreOfThisType={allElementsSameType}
                  isSelected={false}
                  key={jdx}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function panel(view: EditorView): Panel {
  let dom = document.createElement("div");
  let triggerRerender: any = () => {};
  const element = React.createElement(RenderPopoverDocked, {
    buildTriggerRerender: (binder) => {
      triggerRerender = binder;
    },
  });
  setTimeout(() => {
    ReactDOM.render(element, dom);
  }, 100);
  return {
    dom,
    update: (update) => {
      const popState = update.state.field(popOverState);
      const docked = popState.menuState === "hardClosed";
      const node = popState.targetNode;
      // todo make this rerender less frequently
      triggerRerender({
        docked,
        setDock: () => (setToDocked: boolean) => {
          const effect = popoverEffectDispatch.of(
            setToDocked ? "forceClose" : "forceOpen"
          );
          update.view.dispatch({ effects: [effect] });
        },
        menuContents: docked
          ? update.state.field(popOverState).menuContents
          : [],
        eventDispatch: () => (menuEvent: MenuEvent) => {
          const codeUpdate = modifyCodeByCommand(
            menuEvent,
            retargetToAppropriateNode(node!),
            codeString(view, 0)
          );
          if (codeUpdate) {
            simpleUpdate(
              update.view,
              codeUpdate.from,
              codeUpdate.to,
              codeUpdate.value
            );
          }
        },
      });
    },
  };
}

export default function panelPlugin(): Extension {
  return [showPanel.of(panel)];
}
