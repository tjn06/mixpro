import type { ReactNode } from "react";
import {
  FEATURE_TITLE_COLOR,
  FEATURE_TITLE_COLOR_MUTED,
  FEATURE_TITLE_STYLE,
  FEATURE_VALUE_SLOT_STYLE,
} from "../../presentation/featureReadout";

export function FeatureReadoutStack({
  label,
  children,
  muted = false,
}: {
  label: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center text-center w-full min-w-0"
      style={{
        gap: "var(--feature-label-gap)",
        height: "var(--feature-readout-block-h)",
        minHeight: "var(--feature-readout-block-h)",
      }}
    >
      <span
        className="uppercase truncate w-full"
        style={{
          ...FEATURE_TITLE_STYLE,
          color: muted ? FEATURE_TITLE_COLOR_MUTED : FEATURE_TITLE_COLOR,
        }}
      >
        {label}
      </span>
      <div
        className="flex items-center justify-center w-full min-w-0"
        style={FEATURE_VALUE_SLOT_STYLE}
      >
        {children}
      </div>
    </div>
  );
}
