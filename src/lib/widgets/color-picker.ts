import "@simonwep/pickr/dist/themes/classic.min.css";
import Pickr from "@simonwep/pickr";
import { WidgetType, Decoration, Range, EditorView } from "@codemirror/view";
import { SimpleWidget } from "../widgets";
import {
  codeString,
  isColorFunc,
  argListToIntList,
  unwrap,
  colorNames,
} from "../utils";
import { colorRegex } from "./color-name-widget";

// todo replace a bunch of this logic with d3-color

function rgbToString(rgb: number[]): string {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

function createColorPicker(
  el: HTMLElement,
  color: string,
  cb: (color: string) => void
): () => void {
  const colorPicker = Pickr.create({
    el,
    theme: "classic",
    default: color,
    padding: 0,

    swatches: [
      "rgb(244, 67, 54)",
      "rgb(233, 30, 99)",
      "rgb(156, 39, 176)",
      "rgb(103, 58, 183)",
      "rgb(63, 81, 181)",
      "rgb(33, 150, 243)",
      "rgb(3, 169, 244)",
      "rgb(0, 188, 212)",
      "rgb(0, 150, 136)",
      "rgb(76, 175, 80)",
      "rgb(139, 195, 74)",
      "rgb(205, 220, 57)",
      "rgb(255, 235, 59)",
      "rgb(255, 193, 7)",
    ],

    components: {
      // Main components
      preview: true,
      opacity: true,
      hue: true,

      // Input / output Options
      interaction: {
        hex: true,
        rgba: true,
        hsla: false,
        hsva: false,
        cmyk: false,
        input: true,
        clear: false,
        // false because it looks nicer
        // and because colorPicker.on("clear")...
        // doesn't work nicely straight away
        save: true,
      },
    },
  });

  colorPicker.show();

  colorPicker.on("save", (color: Pickr.HSVaColor) => {
    let colorArray;
    switch (colorPicker.getColorRepresentation()) {
      case "HEXA":
        colorArray = color.toHEXA();
        break;
      case "HSVA":
        colorArray = color.toHSVA();
        break;
      case "HSLA":
        colorArray = color.toHSLA();
        break;
      case "CMYK":
        colorArray = color.toCMYK();
        break;
      default:
        colorArray = color.toRGBA();
        break;
    }
    // 0 is for rounding
    // noinspection TypeScriptValidateJSTypes
    cb(colorArray.toString(0));
  });

  return () => colorPicker.destroyAndRemove();
}

export class ColorWidget extends WidgetType {
  constructor(readonly initColor: string, readonly from: number) {
    super();
  }

  eq(other: ColorWidget) {
    return this.from === other.from && this.initColor === other.initColor;
  }

  toDOM() {
    const wrap = document.createElement("button");
    wrap.dataset.from = this.from.toString();
    wrap.className = "cm-color-widget";
    wrap.style.background = this.initColor;
    let child = document.createElement("div");
    wrap.appendChild(child);

    let active = false;
    let destroyColorPickerHandle = () => {};
    const destroyColorPicker = () => {
      destroyColorPickerHandle();

      // Part of destroying the color picker involves destroying its parent
      // thus it is necessary to recreate it
      child = document.createElement("div");
      wrap.appendChild(child);
    };

    wrap.onclick = () => {
      active = !active;

      if (active) {
        destroyColorPickerHandle = createColorPicker(
          child,
          this.initColor,
          (newColor) => {
            const event = new CustomEvent("colorChosen", {
              bubbles: true,
              detail: newColor,
            });
            wrap.dispatchEvent(event);
            destroyColorPicker();
            active = false;
          }
        );
      } else {
        destroyColorPicker();
      }
    };
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}
export function fromRgbaString(
  s: string
): { r: string; g: string; b: string } | null {
  // If a != 1, just revert to "rgba(...)" for simplicity
  const regex = /^rgba\((?<r>\d+),\s*(?<g>\d+),\s*(?<b>\d+),\s*1\)$/;
  const m = s.match(regex);
  if (m !== null) {
    return { r: m.groups!.r, g: m.groups!.g, b: m.groups!.b };
  }
  return null;
}

export function maybeColorFuncCall(
  s: string
): { func: string; tupleArgs: boolean | null } | null {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Groups_and_Ranges
  const m1 = s.match(
    /^(?<func>color|fill|stroke|background)\s*\(\d+,\s*\d+,\s*\d+\)$/
  );
  const m2 = s.match(
    /^(?<func>color|fill|stroke|background)\s*\(\[\d+,\s*\d+,\s*\d+\]\)$/
  );
  const m3 = s.match(/^(?<func>color|fill|stroke|background)\s*\(.*\)$/);

  if (m1 !== null) {
    return { func: m1.groups!.func, tupleArgs: false };
  } else if (m2 !== null) {
    return { func: m2.groups!.func, tupleArgs: true };
  } else if (m3 !== null) {
    return { func: m3.groups!.func, tupleArgs: null };
  }
  return null;
}

export function changeColor(
  view: EditorView,
  pos: number,
  color: string,
  from: number
) {
  const colorFuncCall = maybeColorFuncCall(codeString(view, from, pos));
  const rgba = fromRgbaString(color);

  let insert: string;
  if (rgba !== null) {
    if (colorFuncCall && colorFuncCall.tupleArgs) {
      insert = `${colorFuncCall.func}([${rgba.r}, ${rgba.g}, ${rgba.b}])`;
    } else if (colorFuncCall && !colorFuncCall.tupleArgs) {
      insert = `${colorFuncCall.func}(${rgba.r}, ${rgba.g}, ${rgba.b})`;
    } else {
      insert = `"${color}"`;
    }
  } else {
    if (colorFuncCall) {
      insert = `${colorFuncCall.func}("${color}")`;
    } else {
      insert = `"${color}"`;
    }
  }
  view.dispatch({ changes: { from, to: pos, insert } });
  return true;
}

const SimpleColorPickerWidget: SimpleWidget = {
  checkForAdd: (type, view, currentNode) => type.name === "ArgList",
  addNode: (view, from, to, argList) => {
    // const argList = get();
    const variableName = argList.parent!.getChild("VariableName")!;
    const theFunc = codeString(view, variableName.from, variableName.to);
    const widgets: Range<Decoration>[] = [];

    if (isColorFunc(theFunc)) {
      const argListStrings = argList.getChildren("String");
      const argListNumbers = argList.getChildren("Number");
      const argListArrayExp = argList.getChild("ArrayExpression");
      const makeWidget = (color: string) => {
        const deco = Decoration.widget({
          widget: new ColorWidget(color, argList.parent!.from),
          side: 1,
        });
        widgets.push(deco.range(argList.parent!.to));
      };

      if (argListStrings.length === 1) {
        // avoid the quotation marks and parentheses (assuming no spaces)
        const val = codeString(view, from + 2, to - 2);
        if (val.match(colorRegex)) {
          makeWidget(val);
        } else if (Object.keys(colorNames).includes(val.toLowerCase())) {
          // TODO: replace this with a color name picker
          makeWidget(colorNames[val.toLowerCase()]);
        }
        // TODO: handle 4, twice
      } else if (argListNumbers.length === 3) {
        makeWidget(rgbToString(argListToIntList(view, argListNumbers)));
      } else if (
        argListArrayExp &&
        argListArrayExp.getChildren("Number").length === 3
      ) {
        makeWidget(
          rgbToString(
            argListToIntList(view, argListArrayExp.getChildren("Number"))
          )
        );
      }
    }
    return widgets;
  },
  eventSubscriptions: {
    colorChosen: (e, view) => {
      const from = unwrap(
        (e as any).target.dataset.from,
        "Missing 'from' dataset value"
      );
      return changeColor(
        view,
        view.posAtDOM((e as any).target),
        e.detail as any,
        parseInt(from)
      );
    },
  },
};
export default SimpleColorPickerWidget;
