import { ColorNameProjection, HexConversionProject } from "./ColorNamePicker";
import TooltipHexColorPicker from "./ColorPicker";
import { Projection } from "../lib/projections";
import InsertRandomWord from "./RandomWord";
import ClickTarget from "./ClickTarget";
import BooleanTarget from "./Boolean";
import ColorChip from "./ColorChip";
import CleanUp from "./CleanUp";
import NumberSlider from "./NumberSlider";
import SortObject from "./SortObject";
import Debugger from "./Debugger";
// import HeuristicJSONFixes from "./HeuristicJSONFixes";

const bundle = {
  BooleanTarget,
  CleanUp,
  ClickTarget,
  ColorChip,
  ConvertHex: HexConversionProject,
  Debugger,
  // HeuristicJSONFixes,
  InsertRandomWord,
  NumberSlider,
  SortObject,
  TooltipColorNamePicker: ColorNameProjection,
  TooltipHexColorPicker,
} as Record<string, Projection>;

export default bundle;
