import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { BucketSelection } from "../../domain/bucket/types";
import { RECOMMENDED_MAX_FILL_PERCENT } from "../../domain/bucket/types";
import { CloseIcon } from "../shared/ActionIcons";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import {
  SHEET_COVER_HEADER_STYLE,
  SHEET_LIST_ROW_CLASS,
  SHEET_SUBTITLE,
  SHEET_TITLE,
} from "./sheetChrome";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { cv } from "../../ui/tokens";

const SHEET_PAD_X = 20;
const BODY_TEXT: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: "var(--text-ui-md)",
  fontWeight: 500,
  letterSpacing: "0.03em",
  lineHeight: 1.45,
  color: cv.text.secondary,
  margin: 0,
};

const STAT_LABEL: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: "var(--text-ui-xs)",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: cv.text.muted,
  lineHeight: 1.1,
};

const STAT_VALUE: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: "var(--text-ui-md)",
  fontWeight: 600,
  letterSpacing: "0.03em",
  color: cv.text.primary,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.25,
};

function formatBatchWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(3)} kg`;
  return `${Math.round(grams)} g`;
}

function bucketLabel(selection: BucketSelection, t: TFunction<"common">): string {
  return selection === "none"
    ? t("mixer.bucket.noBucket")
    : t("mixer.bucket.liters", { size: selection });
}

export interface RecBatchInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketSelection: BucketSelection;
  /** Recipe nominal recommended total (Rec. batch readout). */
  recommendedNominalGrams: number;
  /** Max recommended total for the selected bucket at 86% fill. */
  recommendedForBucketGrams: number;
  /** Current working mix total. */
  currentMixTotalGrams: number;
  /** Fill % of current mix in selected bucket, or null when no bucket. */
  mixFillPercent: number | null;
}

function InfoBullet({ children }: { children: ReactNode }) {
  return (
    <li style={{ ...BODY_TEXT, paddingLeft: 4 }}>
      {children}
    </li>
  );
}

export function RecBatchInfoSheet({
  open,
  onOpenChange,
  bucketSelection,
  recommendedNominalGrams,
  recommendedForBucketGrams,
  currentMixTotalGrams,
  mixFillPercent,
}: RecBatchInfoSheetProps) {
  const { t } = useTranslation("common");
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPortal(null);
      return;
    }
    setPortal(document.querySelector<HTMLElement>(".app-frame"));
  }, [open]);

  if (!open || !portal) return null;

  const hasBucket = bucketSelection !== "none";
  const showBucketRec =
    hasBucket && Math.abs(recommendedForBucketGrams - recommendedNominalGrams) > 0.5;

  const sheet = (
    <AppFrameCoverSheet
      open={open}
      zIndex={34}
      ariaLabelledBy="rec-batch-info-title"
    >
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_HEADER_STYLE}
      >
        <h2 id="rec-batch-info-title" style={SHEET_TITLE}>
          {t("sheets.recBatchInfo.title")}
        </h2>
        <p style={{ ...SHEET_SUBTITLE, maxWidth: 300, textAlign: "center" }}>
          {t("sheets.recBatchInfo.safeAmount")}
        </p>
      </header>

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-none"
        style={{
          paddingLeft: SHEET_PAD_X,
          paddingRight: SHEET_PAD_X,
          paddingBottom: 12,
        }}
      >
        <div
          className={`${SHEET_LIST_ROW_CLASS} rounded-2xl w-full max-w-[360px] mx-auto flex flex-col`}
          style={{ padding: "14px 16px", gap: 10, marginBottom: 16 }}
        >
          <div className="flex flex-col" style={{ gap: 4 }}>
            <span style={STAT_LABEL}>{t("sheets.recBatchInfo.yourBucket")}</span>
            <span style={STAT_VALUE}>{bucketLabel(bucketSelection, t)}</span>
          </div>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <span style={STAT_LABEL}>{t("sheets.recBatchInfo.recBatchRecipe")}</span>
            <span style={STAT_VALUE}>{formatBatchWeight(recommendedNominalGrams)}</span>
          </div>
          {showBucketRec ? (
            <div className="flex flex-col" style={{ gap: 4 }}>
              <span style={STAT_LABEL}>
                {t("sheets.recBatchInfo.recForBucket", {
                  size: bucketSelection,
                  fill: RECOMMENDED_MAX_FILL_PERCENT,
                })}
              </span>
              <span style={STAT_VALUE}>{formatBatchWeight(recommendedForBucketGrams)}</span>
            </div>
          ) : null}
          <div
            style={{
              height: 1,
              background: cv.border.subtle,
              margin: "2px 0",
            }}
          />
          <div className="flex flex-col" style={{ gap: 4 }}>
            <span style={STAT_LABEL}>{t("sheets.recBatchInfo.yourMix")}</span>
            <span style={STAT_VALUE}>{formatBatchWeight(currentMixTotalGrams)}</span>
            {hasBucket && mixFillPercent != null ? (
              <span style={{ ...BODY_TEXT, fontSize: "var(--text-ui-sm)" }}>
                {t("sheets.recBatchInfo.mixFillOfBucket", {
                  percent: mixFillPercent,
                  size: bucketSelection,
                })}
              </span>
            ) : null}
          </div>
        </div>

        <ul
          className="w-full max-w-[360px] mx-auto list-disc"
          style={{
            margin: 0,
            paddingLeft: 22,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <InfoBullet>
            {t("sheets.recBatchInfo.bulletHeadroom", {
              fill: RECOMMENDED_MAX_FILL_PERCENT,
            })}
          </InfoBullet>
          <InfoBullet>{t("sheets.recBatchInfo.bulletBucketSizes")}</InfoBullet>
          <InfoBullet>{t("sheets.recBatchInfo.bulletPotLife")}</InfoBullet>
          <InfoBullet>
            {t("sheets.recBatchInfo.bulletReset", {
              reset: t("mixer.reset"),
            })}
          </InfoBullet>
        </ul>

        <p
          style={{
            ...BODY_TEXT,
            fontSize: "var(--text-ui-sm)",
            maxWidth: 360,
            margin: "14px auto 0",
            textAlign: "center",
          }}
        >
          {t("sheets.recBatchInfo.fillNote")}
        </p>
      </div>

      <SheetFooter
        buttons={[
          {
            key: "close",
            label: t("common.close"),
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
          },
        ]}
      />
    </AppFrameCoverSheet>
  );

  return createPortal(sheet, portal);
}
