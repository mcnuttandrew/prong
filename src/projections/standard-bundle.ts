import { ColorNameProjection, HexConversionProject } from "./ColorNamePicker";
import ColorProjection from "./ColorPicker";
import { Projection } from "../lib/projections";

export default [
  ColorNameProjection,
  ColorProjection,
  HexConversionProject,
] as Projection[];
