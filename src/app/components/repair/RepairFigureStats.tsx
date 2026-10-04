import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { estimateRepairHoleVolume } from "../../domain/repair/estimate";
import {
  formatRepairAreaMm2,
  formatRepairLiters,
} from "../../domain/repair/format";
import { analyticPlanAreaMm2, buildOutlineMm } from "../../domain/repair/outline";
import type { RepairHole } from "../../domain/repair/types";

/** Readable area / live volume / confidence strip under the plan figure. */
export function RepairFigureStats({ hole }: { hole: RepairHole }) {
  const { t } = useTranslation("common");

  const { areaMm2, estimate } = useMemo(() => {
    const outlineMm = buildOutlineMm(
      hole.shapeType,
      hole.dimensions,
      hole.outline,
    );
    return {
      areaMm2: analyticPlanAreaMm2(
        hole.shapeType,
        hole.dimensions,
        outlineMm,
      ),
      estimate: estimateRepairHoleVolume(hole),
    };
  }, [hole]);

  const confidenceKey =
    estimate?.confidence === "HIGH"
      ? "repair.confidence.high"
      : estimate?.confidence === "MEDIUM"
        ? "repair.confidence.medium"
        : estimate?.confidence === "LOW"
          ? "repair.confidence.low"
          : estimate
            ? "repair.confidence.experimental"
            : null;

  return (
    <div className="repair-figure-stats" aria-live="polite">
      <div className="repair-figure-stats__row">
        <span className="repair-figure-stats__key">{t("repair.figure.area")}</span>
        <span className="repair-figure-stats__value">
          {formatRepairAreaMm2(areaMm2)}
        </span>
      </div>
      <div className="repair-figure-stats__row">
        <span className="repair-figure-stats__key">
          {t("repair.figure.volume")}
        </span>
        <span className="repair-figure-stats__value">
          {estimate
            ? formatRepairLiters(estimate.expectedLiters)
            : t("repair.figure.volumePending")}
          {confidenceKey ? (
            <span className="repair-figure-stats__confidence">
              {" "}
              · {t(confidenceKey)}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
