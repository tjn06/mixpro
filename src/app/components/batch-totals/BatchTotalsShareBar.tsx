import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BlendingRecipe } from "../../domain/recipe/types";
import {
  batchReportCommentPlaceholder,
  batchTotalsReportSubject,
  buildBatchTotalsReportText,
  type BatchReportLanguage,
} from "../../domain/batch-totals/report";
import {
  copyTextToClipboard,
  openMailWithReport,
  openSmsWithReport,
} from "../../domain/batch-totals/share";
import type { ExtraBatchEntry } from "../../domain/batch-totals/extraBatches";
import {
  CopyIcon,
  LoadIcon,
  MailIcon,
  MessageIcon,
  RenameIcon,
  SavedIcon,
  SaveIcon,
} from "../shared/ActionIcons";
import { SHEET_FIELD_INPUT_CLASS, sheetFieldInputStyle } from "../sheets/sheetChrome";
import { SHEET_FOOTER_BTN_H, SHEET_FOOTER_ICON_SIZE } from "../sheets/SheetCloseButton";

const SHARE_LABELS = {
  sv: {
    save: "Spara",
    saved: "Sparad",
    load: "Öppna",
    copy: "Kopiera",
    copied: "Kopierad",
    mail: "E-post",
    text: "SMS",
    closeComment: "Stäng kommentar",
  },
  en: {
    save: "Save",
    saved: "Saved",
    load: "Load",
    copy: "Copy",
    copied: "Copied",
    mail: "Mail",
    text: "Text",
    closeComment: "Close comment",
  },
} as const;

function ShareIconButton({
  label,
  onClick,
  icon,
  active = false,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`batch-totals-dock-orb share-icon-btn relative flex flex-col items-center justify-center overflow-hidden touch-none transition-colors duration-150${
        active ? " share-icon-btn--active batch-totals-dock-orb--active" : ""
      }`}
    >
      {icon}
    </button>
  );
}

/** Expands across orb columns 2–4 when the pen is open. */
function CommentGridInput({
  value,
  onChange,
  onClose,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`${SHEET_FIELD_INPUT_CLASS} batch-totals-dock-comment-slot min-w-0`}
      style={sheetFieldInputStyle({
        height: 44,
        padding: "0 14px",
        borderRadius: 9999,
      })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      onBlur={(e) => {
        const next = e.relatedTarget;
        if (next instanceof Node && e.currentTarget.parentElement?.contains(next)) {
          return;
        }
        onClose();
      }}
    />
  );
}

export interface BatchTotalsShareBarProps {
  recipe: BlendingRecipe;
  values: number[];
  extraBatches: ExtraBatchEntry[];
  entityIndexes: number[];
  multiplier: number;
  onSave?: () => void;
  onLoad?: () => void;
  /** Temporary checkmark after a successful save (same pattern as mixer saveFlash). */
  saveFlash?: boolean;
}

export function BatchTotalsShareBar({
  recipe,
  values,
  extraBatches,
  entityIndexes,
  multiplier,
  onSave,
  onLoad,
  saveFlash = false,
}: BatchTotalsShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const language: BatchReportLanguage = "sv";
  const [comment, setComment] = useState("");
  const labels = SHARE_LABELS[language];
  const commentPlaceholder = batchReportCommentPlaceholder(language);
  const hasComment = comment.trim().length > 0;
  const showLibrary = Boolean(onSave || onLoad);

  const reportText = useMemo(
    () =>
      buildBatchTotalsReportText(
        recipe,
        values,
        entityIndexes,
        multiplier,
        language,
        comment,
        extraBatches,
      ),
    [recipe, values, entityIndexes, multiplier, language, comment, extraBatches],
  );

  const reportSubject = useMemo(
    () => batchTotalsReportSubject(recipe, language, comment),
    [recipe, language, comment],
  );

  const handleCopy = useCallback(async () => {
    const ok = await copyTextToClipboard(reportText);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [reportText]);

  const handleMail = useCallback(() => {
    openMailWithReport(reportSubject, reportText);
  }, [reportSubject, reportText]);

  const handleSms = useCallback(() => {
    openSmsWithReport(reportText);
  }, [reportText]);

  const closeComment = useCallback(() => setCommentOpen(false), []);

  return (
    <div className="batch-totals-dock-actions flex flex-col items-stretch min-w-0 w-full">
      <section className="batch-totals-dock-module flex flex-col items-stretch min-w-0 w-full">
        <div className="batch-totals-dock-orb-grid">
          <ShareIconButton
            label={commentOpen ? labels.closeComment : commentPlaceholder}
            onClick={() => setCommentOpen((open) => !open)}
            icon={<RenameIcon />}
            active={commentOpen || hasComment}
          />

          {commentOpen ? (
            <CommentGridInput
              value={comment}
              onChange={setComment}
              onClose={closeComment}
              placeholder={commentPlaceholder}
            />
          ) : (
            <>
              <ShareIconButton
                label={copied ? labels.copied : labels.copy}
                onClick={handleCopy}
                icon={copied ? <SavedIcon /> : <CopyIcon />}
                active={copied}
              />
              <ShareIconButton label={labels.mail} onClick={handleMail} icon={<MailIcon />} />
              <ShareIconButton label={labels.text} onClick={handleSms} icon={<MessageIcon />} />
            </>
          )}
        </div>
      </section>

      {showLibrary ? (
        <div className="flex min-w-0 w-full" style={{ gap: 8 }}>
          {onSave ? (
            <button
              type="button"
              aria-label={saveFlash ? labels.saved : labels.save}
              onClick={onSave}
              className={`sheet-footer-btn flex-1 min-w-0 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-[0.98]${
                saveFlash ? " sheet-footer-btn--flash" : ""
              }`}
              style={{ height: SHEET_FOOTER_BTN_H }}
            >
              <span
                className="flex shrink-0 items-center justify-center"
                style={{ width: SHEET_FOOTER_ICON_SIZE, height: SHEET_FOOTER_ICON_SIZE }}
              >
                {saveFlash ? (
                  <SavedIcon size={SHEET_FOOTER_ICON_SIZE} />
                ) : (
                  <SaveIcon size={SHEET_FOOTER_ICON_SIZE} />
                )}
              </span>
            </button>
          ) : null}
          {onLoad ? (
            <button
              type="button"
              aria-label={labels.load}
              onClick={onLoad}
              className="sheet-footer-btn flex-1 min-w-0 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ height: SHEET_FOOTER_BTN_H }}
            >
              <span
                className="flex shrink-0 items-center justify-center"
                style={{ width: SHEET_FOOTER_ICON_SIZE, height: SHEET_FOOTER_ICON_SIZE }}
              >
                <LoadIcon size={SHEET_FOOTER_ICON_SIZE} />
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
