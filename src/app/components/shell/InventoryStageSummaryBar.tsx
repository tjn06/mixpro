import type { ReactNode, Ref } from "react";
import type { ColorScheme } from "../../../theme/appearance";
import { entityValueColor } from "../../presentation/entityCardStyles";
import { cv } from "../../ui/tokens";

function StatusLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: "var(--text-totals-table)",
        fontWeight: 500,
        letterSpacing: "0.12em",
        lineHeight: 1.2,
        textTransform: "uppercase",
        color: cv.text.dimmed,
        padding: "0 var(--totals-section-title-pad-x)",
      }}
    >
      {children}
    </span>
  );
}

function StatusValue({
  children,
  colorScheme,
}: {
  children: ReactNode;
  colorScheme: ColorScheme;
}) {
  return (
    <span
      className="app-readout tabular-nums whitespace-nowrap shrink-0"
      style={{
        fontSize: "var(--text-totals-sum)",
        color: entityValueColor(true, colorScheme),
        fontWeight: 700,
        lineHeight: 1.1,
      }}
    >
      {children}
    </span>
  );
}

/** Compact bar for Tools / Consumables stages (session + catalog Select). */
export function InventoryStageSummaryBar({
  label,
  count,
  nounSingular,
  nounPlural,
  colorScheme,
  compactSummaryRef,
}: {
  label: string;
  count: number;
  nounSingular: string;
  nounPlural: string;
  colorScheme: ColorScheme;
  compactSummaryRef?: Ref<HTMLDivElement>;
}) {
  const noun = count === 1 ? nounSingular : nounPlural;

  return (
    <div className="min-w-0 w-full batch-totals-summary-bar">
      <div className="batch-totals-summary-bar__card w-full min-w-0 flex flex-col min-h-0">
        <div
          ref={compactSummaryRef}
          className="grid items-center min-w-0 w-full batch-totals-summary-bar__grid batch-totals-summary-bar__compact"
          style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
        >
          <div className="batch-totals-summary-bar__batch-rows min-w-0">
            <div className="batch-totals-summary-bar__batch-row">
              <StatusLabel>{label}</StatusLabel>
            </div>
          </div>
          <div className="batch-totals-summary-bar__total batch-totals-summary-bar__total--inventory">
            <span className="batch-totals-summary-bar__metric-label">
              {count > 0 ? "Selected" : "None selected"}
            </span>
            {count > 0 ? (
              <>
                <StatusValue colorScheme={colorScheme}>{count}</StatusValue>
                <span className="batch-totals-summary-bar__metric-unit">
                  {noun}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
