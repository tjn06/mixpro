import type { ReactNode } from "react";
import {
  FEATURE_LABEL_GAP,
  FEATURE_TITLE_COLOR,
  FEATURE_TITLE_COLOR_MUTED,
  FEATURE_TITLE_STYLE,
  FEATURE_VALUE_SLOT_STYLE,
  FEATURE_READOUT_BLOCK_H,
} from "../featureReadout";

interface FeatureReadoutStackProps {
  label: string;
  muted?: boolean;
  children: ReactNode;
}

/** Label + fixed-size value slot — shared by bucket size + rec. batch. */
export function FeatureReadoutStack({ label, muted = false, children }: FeatureReadoutStackProps) {
  return (
    <div
      className="flex flex-col items-center w-full min-w-0 shrink-0"
      style={{ gap: FEATURE_LABEL_GAP, height: FEATURE_READOUT_BLOCK_H, minHeight: FEATURE_READOUT_BLOCK_H }}
    >
      <span
        className="uppercase truncate w-full text-center"
        style={{
          ...FEATURE_TITLE_STYLE,
          color: muted ? FEATURE_TITLE_COLOR_MUTED : FEATURE_TITLE_COLOR,
        }}
      >
        {label}
      </span>
      <div
        className="flex items-center justify-center min-w-0 overflow-visible"
        style={FEATURE_VALUE_SLOT_STYLE}
      >
        {children}
      </div>
    </div>
  );
}
