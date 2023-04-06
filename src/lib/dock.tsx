import * as React from "react";
import { useState, useEffect } from "react";
import * as ReactDOM from "react-dom";
import { Extension } from "@codemirror/state";
import { EditorView, showPanel, Panel } from "@codemirror/view";
import { usePersistedState } from "../examples/example-utils";
import {
  popOverState,
  popoverEffectDispatch,
  buildProjectionsForMenu,
  maybeFilterToFullProjection,
} from "./popover-menu/PopoverState";
import {
  MenuRow,
  retargetToAppropriateNode,
  simpleMerge,
} from "./compute-menu-contents";
import PopoverMenuElement from "./popover-menu/PopoverMenuElement";
import { MenuEvent, modifyCodeByCommand } from "./modify-json";
import { codeString, simpleUpdate, getCursorPos, simpleParse } from "./utils";
import { filterContents } from "./search";

let monocleTarget: HTMLDivElement | null =
  document.querySelector("#cm-monocle");
if (!monocleTarget) {
  const body = document.querySelector("body")!;
  monocleTarget = document.createElement("div");
  monocleTarget.id = "cm-monocle";
  // .setAttribute("id", "cm-monocle");
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
      <div>
        Press Escape to dock the menu or{" "}
        {setDock && <button onClick={() => setDock(true)}>click here</button>}
      </div>
    );
  }
  return (
    <div className="cm-dock">
      <div className="cm-dock-label">
        {/* {!docked && (
          <div>
            Press Escape to dock the menu or{" "}
            {setDock && (
              <button onClick={() => setDock(true)}>click here↓</button>
            )}
          </div>
        )} */}
        {/* {docked && (
          <div>
            Press CMD+. to undock the menu or{" "}
            {setDock && (
              <button onClick={() => setDock(false)}>click here↑</button>
            )}
          </div>
        )} */}

        {docked && (
          <div>
            Press CMD+. to reattach the menu
            {setDock && (
              <button onClick={() => setDock(false)}>click here</button>
            )}
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

      {filteredContent.map((row, idx) => {
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

interface MonocleProps {
  monoclePos: MonoclePosition;
  setMonoclePos: (monocle: string) => void;
  docked: boolean;
}
class Monocle extends React.Component<MonocleProps, { dragging: boolean }> {
  el: HTMLDivElement;
  constructor(props: MonocleProps) {
    super(props);
    this.el = document.createElement("div");
  }

  componentDidMount() {
    monocleTarget!.appendChild(this.el);
    if (this.props.monoclePos.x === null) {
      this.props.setMonoclePos(JSON.stringify({ x: 0, y: 0 }));
    }
    monocleTarget?.setAttribute("style", "display: block");
  }

  componentWillUnmount() {
    monocleTarget!.removeChild(this.el);
    monocleTarget?.setAttribute("style", "display: none");
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
                    JSON.stringify({ x: e.clientX, y: e.clientY })
                  );
                };
              }}
              onMouseUp={() => {
                document.onmousemove = null;
              }}
            />
          )}
          {this.props.children}
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
    x: null,
    y: null,
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
  let isMonocle = true;
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
