import { WidgetType, EditorView, Decoration } from "@codemirror/view";
import { SimpleWidget } from "../widgets";
import { unwrap, argListToIntList } from "../utils";
export class SliderWidget extends WidgetType {
  constructor(
    readonly min: number,
    readonly max: number,
    readonly value: number,
    readonly step: number,
    readonly from: number
  ) {
    super();
  }

  eq(other: SliderWidget) {
    return (
      this.min === other.min &&
      this.max === other.max &&
      this.step === other.step &&
      this.from === other.from
    );
  }

  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "cm-slider-widget";
    wrap.dataset.from = this.from.toString();
    const input = document.createElement("input");
    input.type = "range";
    input.min = this.min.toString();
    input.max = this.max.toString();
    input.step = this.step.toString();
    input.value = this.value.toString();
    wrap.appendChild(input);
    return wrap;
  }

  ignoreEvent(e: Event) {
    // The mousedown event causes a weird issue where the event passes down into the editor
    // and the click is not registered with the slider
    return e.type === "mousedown";
  }
}

function changeSlider(
  view: EditorView,
  pos: number,
  from: number,
  value: string
) {
  const regex = /(?<=_slider\(\s*\d+\s*,\s*\d+\s*,\s*)\d+/;
  view.dispatch({
    changes: {
      from: from,
      to: pos,
      insert: view.state.doc.sliceString(from, pos).replace(regex, value),
    },
  });
  return true;
}

const SimpleSliderWidget: SimpleWidget = {
  checkForAdd: (type, view, argList) => {
    return false;
    // const variableName = argList.parent!.getChild("VariableName")!;
    // return isSliderFunc(codeString(view, variableName.from, variableName.to));
  },
  addNode: (view, from, to, argList) => {
    const argListNumbers = argList.getChildren("Number");
    if (argListNumbers.length === 3 || argListNumbers.length === 4) {
      const [min, max, value, step = 1] = argListToIntList(
        view,
        argListNumbers
      );
      const deco = Decoration.widget({
        widget: new SliderWidget(min, max, value, step, argList.parent!.from),
        side: 1,
      });
      return [deco.range(argList.parent!.to)];
    }
    return [];
  },
  eventSubscriptions: {
    click: (e, view) => {
      const target = e.target as HTMLElement;
      if (target.parentElement!.classList.contains("cm-slider-widget")) {
        // The slider relies on the "click" event as opposed to the "input" event
        // because codemirror does not pick up on the latter for some reason
        const target = e.target as HTMLInputElement;
        const from = unwrap(
          target.parentElement!.dataset.from,
          "Missing 'from' dataset value"
        );
        return changeSlider(
          view,
          view.posAtDOM(target),
          parseInt(from),
          target.value
        );
      }
    },
  },
};
export default SimpleSliderWidget;
