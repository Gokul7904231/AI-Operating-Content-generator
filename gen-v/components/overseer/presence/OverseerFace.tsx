"use client";

import React, { memo } from "react";
import type {
  FaceParameters,
  OverseerIntent,
  VoiceState,
} from "@/factoryos/core/overseer/presence";
import { OverseerFaceRenderer } from "./OverseerFaceRenderer";

export interface OverseerFaceProps {
  targetFaceParameters: FaceParameters;
  intent?: OverseerIntent;
  voiceState?: VoiceState;
  width?: number;
  height?: number;
  className?: string;
  onFaceClick?: () => void;
  enableMouseLook?: boolean;
}

export const OverseerFace: React.FC<OverseerFaceProps> = memo(({
  targetFaceParameters,
  intent = "IDLE",
  voiceState = "IDLE",
  width = 280,
  height = 170,
  className = "",
  onFaceClick,
  enableMouseLook = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      style={{ width, height }}
    >
      <OverseerFaceRenderer
        faceParameters={targetFaceParameters}
        intent={intent}
        voiceState={voiceState}
        width={width}
        height={height}
        onFaceClick={onFaceClick}
        enableMouseLook={enableMouseLook}
      />
    </div>
  );
});

OverseerFace.displayName = "OverseerFace";
