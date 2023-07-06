import { Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { popOverState } from "./popover-menu/PopoverState";
import { popOverCompletionKeymap } from "./popover-menu/KeyboardControls";

export default function popoverPlugin(): Extension {
  return [keymap.of(popOverCompletionKeymap), popOverState];
}
