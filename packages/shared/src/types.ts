export type MessageType = 
  | "INSPECT_SELECTION"
  | "INSPECT_NODE_BY_NAME"
  | "INSPECT_RESPONSE"
  | "HEARTBEAT"
  | "STATUS";

export interface InspectRequest {
  id: string;
  type: "INSPECT_SELECTION" | "INSPECT_NODE_BY_NAME";
  name?: string;
  exportAssets?: boolean;
}

export interface ColorFill {
  type: string;
  colorHex?: string;
  opacity?: number;
}

export interface StrokeStyle {
  type: string;
  colorHex?: string;
  weight?: number;
  opacity?: number;
}

export interface EffectStyle {
  type: string;
  colorHex?: string;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  css?: string;
}

export interface TypographyItem {
  characters: string;
  fontFamily: string;
  fontWeight: number | string;
  fontSize: number;
  lineHeightPx?: number;
  letterSpacingPx?: number;
  colorHex?: string;
}

export interface ExportedAsset {
  nodeId: string;
  name: string;
  format: "svg" | "png";
  dataBase64: string;
}

export interface FigmaRawNodeData {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  layout: {
    layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL";
    padding: { top: number; right: number; bottom: number; left: number };
    itemSpacing: number;
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
  };
  styles: {
    fills: ColorFill[];
    strokes: StrokeStyle[];
    cornerRadius?: number | number[];
    effects: EffectStyle[];
  };
  typography: TypographyItem[];
  assets: ExportedAsset[];
  childrenCount: number;
}

export interface InspectResponse {
  id: string;
  type: "INSPECT_RESPONSE";
  success: boolean;
  data?: FigmaRawNodeData;
  error?: string;
}

/**
 * Super-compact token summary designed specifically to consume minimal LLM tokens (< 250 tokens)
 */
export interface CleanTokenSummary {
  component: string;
  dimensions: { width: number; height: number };
  layout: {
    display: "flex" | "block";
    flexDirection?: "row" | "column";
    padding?: string;
    gap?: string;
    alignItems?: string;
    justifyContent?: string;
  };
  visuals: {
    background?: string;
    borderRadius?: string;
    border?: string;
    boxShadow?: string;
  };
  typography: Array<{
    text: string;
    font: string;
    size: string;
    weight: string | number;
    color: string;
  }>;
  savedAssets: string[];
}
