import * as React from "react";
import { useState, useEffect } from "react";
import * as ReactDOM from "react-dom";
import { Extension } from "@codemirror/state";
import { EditorView, showPanel, Panel } from "@codemirror/view";
import { popOverState } from "./popover-menu/PopoverState";
import { MenuRow } from "./compute-menu-contents";
import PopoverMenuElement from "./popover-menu/PopoverMenuElement";
import { MenuEvent, modifyCodeByCommand } from "./modify-json";
import { codeString, simpleUpdate } from "./utils";

function RenderPopoverDocked(props: {
  buildTriggerRerender: (
    binder: (props: {
      menuContents: MenuRow[];
      eventDispatch: any;
      docked: boolean;
    }) => void
  ) => void;
}) {
  const { buildTriggerRerender } = props;
  const [menuContents, setMenuContents] = useState<MenuRow[]>([]);
  const [eventDispatch, setEventDispatch] = useState<
    (e: MenuEvent, shouldClose?: boolean) => void
  >(() => {});
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    buildTriggerRerender((props) => {
      setDocked(props.docked);
      setMenuContents(props.menuContents);
      setEventDispatch(props.eventDispatch);
    });
  }, [buildTriggerRerender]);

  // todo make this messaging more precise, also support other actions from the dock
  return (
    <div className="cm-dock">
      {!docked && <div>Press Escape to dock the menu</div>}
      {docked && <div>Press CMD+. to undock the menu</div>}
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
        menuContents: docked
          ? update.state.field(popOverState).menuContents
          : [],
        eventDispatch: () => (menuEvent: MenuEvent) => {
          const codeUpdate = modifyCodeByCommand(
            menuEvent,
            node!,
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
