import { ColorNameProjection, HexConversionProject } from "./ColorNamePicker";
import ColorProjection from "./ColorPicker";
import { Projection } from "../lib/projections";
import RandomWordProjection from "./RandomWord";
import ClickTarget from "./ClickTarget";
import BooleanTarget from "./Boolean";
import ColorChip from "./ColorChip";

export default [
  ColorNameProjection,
  ColorProjection,
  HexConversionProject,
  RandomWordProjection,
  ClickTarget,
  BooleanTarget,
  ColorChip,
] as Projection[];
