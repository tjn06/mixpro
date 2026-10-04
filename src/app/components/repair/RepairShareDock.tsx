import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SESSION_REPORT_LANGUAGE } from "../../domain/sessions/report";
import { withRepairShareComment } from "../../domain/repair/shareReport";
import { useSettingsStore } from "../../settings/store";
import { entityValueColor } from "../../presentation/entityCardStyles";
import { cv } from "../../ui/tokens";
import { CatalogSharePanel } from "../catalog/CatalogSharePanel";
import { ShareTextPreview } from "../share/ShareTextPreview";
import { StageBottomSheet } from "../shell/StageBottomSheet";

function RepairReportSummaryBar({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const colorScheme = useSettingsStore((s) => s.colorScheme);

  return (
    <div className="min-w-0 w-full batch-totals-summary-bar">
      <div className="batch-totals-summary-bar__card w-full min-w-0 flex flex-col min-h-0">
        <div
          className="grid items-center min-w-0 w-full batch-totals-summary-bar__grid batch-totals-summary-bar__compact"
          style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
        >
          <div className="batch-totals-summary-bar__batch-rows min-w-0">
            <div className="batch-totals-summary-bar__batch-row">
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
                {label}
              </span>
            </div>
          </div>
          <div className="batch-totals-summary-bar__total batch-totals-summary-bar__total--mass">
            <span
              className="app-readout tabular-nums whitespace-nowrap shrink-0"
              style={{
                fontSize: "var(--text-totals-sum)",
                color: entityValueColor(true, colorScheme),
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {value}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Session/catalog-style share dock for Repair material + packaging reports.
 */
export function RepairShareDock({
  summaryLabel,
  summaryValue,
  reportTitle,
  reportText,
  canShare,
  sourceExpanded,
  onSourceExpandedChange,
  remeasureKey,
  panelId = "repair-share-panel",
}: {
  summaryLabel: string;
  summaryValue: string;
  reportTitle: string;
  reportText: string;
  canShare: boolean;
  sourceExpanded: boolean;
  onSourceExpandedChange: (next: boolean) => void;
  remeasureKey?: string;
  panelId?: string;
}) {
  const { t } = useTranslation("common");
  const [comment, setComment] = useState("");

  const shareText = useMemo(
    () => withRepairShareComment(reportText, comment),
    [reportText, comment],
  );

  const previewHeading = t("repair.shareReportHeading");
  const previewAria = `${previewHeading} — ${reportTitle}`;

  return (
    <StageBottomSheet
      panelId={panelId}
      regionLabel={t("repair.summaryRegion", { title: reportTitle })}
      expandedBodyLabel={previewAria}
      sourceExpanded={sourceExpanded}
      onSourceExpandedChange={onSourceExpandedChange}
      remeasureKey={`${remeasureKey ?? ""}:${comment}:${canShare ? "1" : "0"}`}
      summary={
        <RepairReportSummaryBar label={summaryLabel} value={summaryValue} />
      }
      shareActions={
        <CatalogSharePanel
          title={reportTitle}
          reportText={shareText}
          comment={comment}
          onCommentChange={setComment}
          canShare={canShare}
          language={SESSION_REPORT_LANGUAGE}
        />
      }
      expandedBody={
        <ShareTextPreview
          heading={previewHeading}
          subtitle={reportTitle}
          text={shareText}
        />
      }
    />
  );
}
