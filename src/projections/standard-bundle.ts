import { ColorNameProjection, HexConversionProject } from "./ColorNamePicker";
import ColorProjection from "./ColorPicker";
import { Projection } from "../lib/projections";
import RandomWordProjection from "./RandomWord";

export default [
  ColorNameProjection,
  ColorProjection,
  HexConversionProject,
  RandomWordProjection,
] as Projection[];
