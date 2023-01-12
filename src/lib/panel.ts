import { Extension } from "@codemirror/state";
import { EditorView, showPanel, Panel } from "@codemirror/view";
import { popOverState, visibleStates } from "./popover-menu/PopoverState";

function panel(view: EditorView): Panel {
  let dom = document.createElement("div");
  const initialMenuState = view.state.field(popOverState).menuState;
  const initiallyVisible = visibleStates.has(initialMenuState);
  dom.textContent = initiallyVisible ? ":" : "Press button to reopen";
  return {
    dom,
    update: (update) => {
      const menuStateNew = update.state.field(popOverState).menuState;
      const menuStateOld = update.startState.field(popOverState).menuState;
      const visibilityChanged = menuStateNew !== menuStateOld;
      if (!visibilityChanged) {
        return;
      }
      const isVisible = visibleStates.has(menuStateNew);
      dom.textContent = isVisible ? ":" : "Press button to reopen";
    },
  };
}

export default function panelPlugin(): Extension {
  return [showPanel.of(panel)];
}
