import { useState, useEffect, createElement, Component } from "react";
import * as ReactDOM from "react-dom";
import { Extension } from "@codemirror/state";
import { EditorView, showPanel, Panel } from "@codemirror/view";

import { usePersistedState } from "./local-utils";

import {
  popOverState,
  popoverEffectDispatch,
  buildProjectionsForMenu,
  maybeFilterToFullProjection,
} from "./popover-menu/PopoverState";
import { RenderRow } from "./popover-menu/PopoverMenu";
import {
  MenuRow,
  retargetToAppropriateNode,
  simpleMerge,
} from "./compute-menu-contents";
import { MenuEvent, modifyCodeByCommand } from "./modify-json";
import { codeString, simpleUpdate, getCursorPos, simpleParse } from "./utils";
import { filterContents } from "./search";

let monocleTarget: HTMLDivElement | null =
  document.querySelector("#cm-monocle");
if (!monocleTarget) {
  const body = document.querySelector("body")!;
  monocleTarget = document.createElement("div");
  monocleTarget.id = "cm-monocle";
  body?.appendChild(monocleTarget);
}

type MonoclePosition = { x: number | null; y: number | null };
function Content(props: {
  docked: boolean;
  eventDispatch: (e: MenuEvent, shouldClose?: boolean) => void;
  menuContents: MenuRow[];
  searchTerm: string | false;
  setDock: (setToDocked: boolean) => void;
  setSearchTerm: (term: string) => void;
  isMonocle: boolean;
}) {
  const {
    docked,
    eventDispatch,
    menuContents,
    searchTerm,
    setDock,
    setSearchTerm,
  } = props;
  const filteredContent = searchTerm
    ? filterContents(searchTerm, menuContents)
    : menuContents;

  // todo also support other actions from the dock
  if (!docked) {
    return (
      <div className="cm-dock">
        <div className="cm-dock-label">
          Press Escape to dock the menu or{" "}
          {setDock && <button onClick={() => setDock(true)}>click here</button>}
        </div>
      </div>
    );
  }
  return (
    <div className="cm-dock">
      <div className="cm-dock-label">
        {docked && (
          <div className="prong-flex-down">
            <div>
              <b>Menu</b>
            </div>
            <div>Click the circle to drag and place this menu!!!</div>
            <div>
              Press CMD+. to reattach the menu
              {setDock && (
                <button onClick={() => setDock(false)}>or click here</button>
              )}
            </div>
          </div>
        )}
        {docked && (
          <div>
            <div>Search</div>
            <input
              value={searchTerm || ""}
              title={"Docked Search Bar"}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
            />
          </div>
        )}
      </div>
      {filteredContent.map((row, idx) => (
        <RenderRow
          row={row}
          idx={idx}
          key={idx}
          eventDispatch={eventDispatch}
          selectedRouting={false}
          setSelectedRouting={false}
        />
      ))}
    </div>
  );
}

interface MonocleProps {
  monoclePos: MonoclePosition;
  setMonoclePos: (monocle: string) => void;
  docked: boolean;
}
class Monocle extends Component<MonocleProps, { dragging: boolean }> {
  el: HTMLDivElement;
  constructor(props: MonocleProps) {
    super(props);
    this.el = document.createElement("div");
  }

  componentDidMount() {
    if (monocleTarget?.getAttribute("style") === "display: block") {
      return;
    }
    while (monocleTarget!.firstChild) {
      monocleTarget!.removeChild(monocleTarget!.firstChild);
    }
    monocleTarget!.appendChild(this.el);
    if (this.props.monoclePos.x === null) {
      this.props.setMonoclePos(JSON.stringify({ x: 0, y: 0 }));
    }
    monocleTarget?.setAttribute("style", "display: block");
  }

  componentWillUnmount() {
    if (monocleTarget) {
      // monocleTarget.removeChild(this.el);
      while (monocleTarget.firstChild) {
        monocleTarget.removeChild(monocleTarget.firstChild);
      }
      monocleTarget?.setAttribute("style", "display: none");
    }
  }

  render() {
    // @ts-ignore
    return ReactDOM.createPortal(
      <div
        className="cm-monocle-container"
        style={{
          left: this.props.monoclePos?.x || 0,
          top: this.props.monoclePos?.y || 0,
        }}
      >
        <div className="position-relative">
          {this.props.docked && (
            <div
              className="cm-monocle-drag-target"
              onMouseDown={() => {
                document.onmousemove = (e) => {
                  e.preventDefault();
                  this.props.setMonoclePos(
                    JSON.stringify({ x: e.clientX, y: e.clientY + 25 })
                  );
                };
                document.onmouseup = () => {
                  document.onmousemove = null;
                  document.onmouseup = null;
                };
              }}
            />
          )}
          {/* @ts-ignore */}
          {this.props.children as any}
        </div>
      </div>,
      this.el
    );
  }
}

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
  const [monoclePos, setMonoclePos] = usePersistedState(
    "cm-monocle-position",
    `{
    x: 300,
    y: 300,
  }`
  );
  const [menuContents, setMenuContents] = useState<MenuRow[]>([]);
  const [eventDispatch, setEventDispatch] = useState<
    (e: MenuEvent, shouldClose?: boolean) => void
  >(() => {});
  const [docked, setDockedState] = useState(false);
  const [searchTerm, setSearchTerm] = useState<false | string>(false);
  const [setDock, bindSetDock] = useState<(setToDocked: boolean) => void>(
    () => {}
  );
  useEffect(() => {
    buildTriggerRerender((props) => {
      setDockedState(props.docked);
      setMenuContents(props.menuContents);
      setEventDispatch(props.eventDispatch);
      bindSetDock(props.setDock);
      setSearchTerm(false);
    });
  }, [buildTriggerRerender]);
  // TODO dock mode removed for now
  const isMonocle = true;
  const content = (
    <Content
      menuContents={menuContents}
      eventDispatch={eventDispatch}
      docked={docked}
      searchTerm={searchTerm}
      setDock={setDock}
      setSearchTerm={setSearchTerm}
      isMonocle={isMonocle}
    />
  );
  // if (isMonocle) {
  if (docked) {
    return (
      // @ts-ignore
      <Monocle
        monoclePos={simpleParse(monoclePos, { x: 0, y: 0 })}
        setMonoclePos={setMonoclePos}
        docked={docked}
      >
        {content}
      </Monocle>
    );
  } else {
    return content;
  }
}

function panel(view: EditorView): Panel {
  const dom = document.createElement("div");
  let triggerRerender: any = () => {};
  const element = createElement(RenderPopoverDocked, {
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

      const fullCode = codeString(view, 0);
      const currentCodeSlice = codeString(view, node?.from || 0, node?.to || 0);
      // todo make this rerender less frequently
      let contents: MenuRow[] = [];
      try {
        contents = simpleMerge(
          maybeFilterToFullProjection([
            ...update.state.field(popOverState).menuContents,
            ...buildProjectionsForMenu({
              fullCode,
              currentCodeSlice,
              node,
              view: update.view,
              state: update.state,
            }),
          ])
        );
      } catch (e) {
        console.log("error building docked contents", e);
      }
      triggerRerender({
        docked,
        setDock: () => (setToDocked: boolean) => {
          const effect = popoverEffectDispatch.of(
            setToDocked ? "forceClose" : "forceOpen"
          );
          update.view.dispatch({ effects: [effect] });
        },
        menuContents: docked ? contents : [],
        eventDispatch: () => (menuEvent: MenuEvent) => {
          const codeUpdate = modifyCodeByCommand(
            menuEvent,
            retargetToAppropriateNode(node!),
            fullCode,
            getCursorPos(update.state)
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
