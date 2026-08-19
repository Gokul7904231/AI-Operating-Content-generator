"use client";

import React from "react";
import type { OverseerPresenceEnvelope } from "@/factoryos/core/overseer/presence";
import { OverseerCommandSurface } from "./OverseerCommandSurface";

export interface OverseerPresenceViewProps {
  initialPresence?: OverseerPresenceEnvelope;
  className?: string;
  isDashboardEmbedded?: boolean;
}

export const OverseerPresenceView: React.FC<OverseerPresenceViewProps> = (props) => {
  return <OverseerCommandSurface {...props} />;
};
