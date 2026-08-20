"use client";

import React, { memo } from "react";
import type { ExpressionConfig } from "./OverseerStateMachine";

interface BrowSystemProps {
  expression: ExpressionConfig;
}

export const OverseerBrowSystem: React.FC<BrowSystemProps> = memo(({ expression }) => {
  const { browTilt, primaryColor } = expression;

  return (
    <g className="overseer-brow-system">
      {/* Left Micro-Brow */}
      <g transform="translate(95, 42)">
        <g
          style={{
            transform: `rotate(${-browTilt}deg)`,
            transformOrigin: "0px 0px",
            transition: "transform 220ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          <line
            x1="-15"
            y1="0"
            x2="15"
            y2="0"
            stroke={primaryColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeOpacity="0.45"
          />
        </g>
      </g>

      {/* Right Micro-Brow */}
      <g transform="translate(185, 42)">
        <g
          style={{
            transform: `rotate(${browTilt}deg)`,
            transformOrigin: "0px 0px",
            transition: "transform 220ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          <line
            x1="-15"
            y1="0"
            x2="15"
            y2="0"
            stroke={primaryColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeOpacity="0.45"
          />
        </g>
      </g>
    </g>
  );
});

OverseerBrowSystem.displayName = "OverseerBrowSystem";
