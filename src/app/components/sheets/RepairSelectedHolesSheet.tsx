import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { estimateRepairHoleVolume } from "../../domain/repair/estimate";
import {
  formatRepairAreaMm2,
  formatRepairLiters,
} from "../../domain/repair/format";
import { analyticPlanAreaMm2, buildOutlineMm } from "../../domain/repair/outline";
import type { RepairConfidence, RepairHole } from "../../domain/repair/types";
import { CloseIcon } from "../shared/ActionIcons";
import { RepairPlanView } from "../repair/RepairPlanView";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import {
  SHEET_COVER_HEADER_STYLE,
  SHEET_SUBTITLE_CLASS,
  SHEET_TITLE_CLASS,
} from "./sheetChrome";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { cv } from "../../ui/tokens";

function confidenceLabelKey(c: RepairConfidence): string {
  switch (c) {
    case "HIGH":
      return "repair.confidence.high";
    case "MEDIUM":
      return "repair.confidence.medium";
    case "LOW":
      return "repair.confidence.low";
    case "EXPERIMENTAL":
      return "repair.confidence.experimental";
  }
}

function holePlanAreaMm2(hole: RepairHole): number {
  const outlineMm = buildOutlineMm(
    hole.shapeType,
    hole.dimensions,
    hole.outline,
  );
  return analyticPlanAreaMm2(hole.shapeType, hole.dimensions, outlineMm);
}

/** Sheet listing selected repair holes with figure + volume/area detail. */
export function RepairSelectedHolesSheet({
  open,
  onOpenChange,
  holes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Holes currently included in the material calculation (display order). */
  holes: readonly { hole: RepairHole; index: number }[];
}) {
  const { t } = useTranslation("common");
  const titleId = useId();

  return (
    <AppFrameCoverSheet open={open} zIndex={92} ariaLabelledBy={titleId}>
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_HEADER_STYLE}
      >
        <h2 id={titleId} className={SHEET_TITLE_CLASS}>
          {t("repair.selectedHolesSheetTitle")}
        </h2>
        <p className={SHEET_SUBTITLE_CLASS}>
          {t("repair.holesCount", { count: holes.length })}
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-none app-gutter-x">
        <ul className="repair-selected-holes-sheet__list">
          {holes.map(({ hole, index }) => (
            <SelectedHoleRow key={hole.id} hole={hole} index={index} />
          ))}
        </ul>
      </div>

      <SheetFooter
        buttons={[
          {
            key: "close",
            label: t("common.close"),
            tooltip: t("common.close"),
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}

function SelectedHoleRow({
  hole,
  index,
}: {
  hole: RepairHole;
  index: number;
}) {
  const { t } = useTranslation("common");
  const est = useMemo(() => estimateRepairHoleVolume(hole), [hole]);
  const areaMm2 = useMemo(() => holePlanAreaMm2(hole), [hole]);
  const title = hole.name || t("repair.holeN", { n: index + 1 });

  return (
    <li className="repair-selected-holes-sheet__item">
      <div className="repair-selected-holes-sheet__thumb">
        <RepairPlanView hole={hole} compact showDepthMarkers />
      </div>
      <div className="repair-selected-holes-sheet__meta">
        <span className="repair-selected-holes-sheet__title">{title}</span>
        <span className="repair-selected-holes-sheet__volume">
          {est ? (
            <>
              {formatRepairLiters(est.expectedLiters)}
              <span style={{ color: cv.text.muted, fontWeight: 500 }}>
                {" "}
                · {t(confidenceLabelKey(est.confidence))}
              </span>
            </>
          ) : (
            t("repair.needsDepth")
          )}
        </span>
        <span
          className="repair-selected-holes-sheet__area"
          style={{ color: cv.text.muted }}
        >
          {formatRepairAreaMm2(areaMm2)}
        </span>
      </div>
    </li>
  );
}
