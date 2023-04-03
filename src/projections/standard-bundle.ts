import { ColorNameProjection, HexConversionProject } from "./ColorNamePicker";
import ColorProjection from "./ColorPicker";
import { Projection } from "../lib/projections";
import RandomWordProjection from "./RandomWord";
import ClickTarget from "./ClickTarget";
import BooleanTarget from "./Boolean";
import ColorChip from "./ColorChip";
import CleanUp from "./CleanUp";

const bundle = {
  BooleanTarget,
  CleanUp,
  ClickTarget,
  ColorChip,
  ConvertHex: HexConversionProject,
  InsertRandomWord: RandomWordProjection,
  TooltipColorNamePicker: ColorNameProjection,
  TooltipHexColorPicker: ColorProjection,
} as Record<string, Projection>;

export default bundle;
