import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
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
import { useAppShellCompact } from "../../hooks/useAppShellCompact";
import { CopyIcon, MailIcon, MessageIcon, RenameIcon, SavedIcon } from "../shared/ActionIcons";
import {
  SHEET_FIELD_INPUT_CLASS,
  sheetFieldInputStyle,
} from "../sheets/sheetChrome";
import { theme } from "../../../theme";

const { colors: c, borders: b, surfaces: s } = theme;
const SHEET_MARGIN_X = 16;
const SHEET_MARGIN_BOTTOM = 16;
const SHEET_RADIUS = 28;
const SHEET_PAD_X = 20;
const SHEET_PAD_Y = 20;
const DONE_H = 44;

const COMMENT_DONE_LABELS = {
  sv: "Klar",
  en: "Done",
} as const;

const SHARE_LABELS = {
  sv: { copy: "Kopiera", copied: "Kopierad", mail: "E-post", text: "SMS" },
  en: { copy: "Copy", copied: "Copied", mail: "Mail", text: "Text" },
} as const;

/* Hidden for now — uncomment ReportLanguageToggle + JSX below to re-enable SWE/ENG.
function ReportLanguageToggle({
  language,
  onChange,
}: {
  language: BatchReportLanguage;
  onChange: (next: BatchReportLanguage) => void;
}) {
  const options: { id: BatchReportLanguage; label: string }[] = [
    { id: "sv", label: "SWE" },
    { id: "en", label: "ENG" },
  ];

  return (
    <div
      className="flex items-center justify-center gap-0.5 rounded-full shrink-0"
      role="group"
      aria-label="Report language"
      style={{
        padding: 2,
        background: s.shareTabGroupBg,
        border: b.panel,
      }}
    >
      {options.map(({ id, label }) => {
        const active = language === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className="rounded-full transition-colors duration-150"
            style={{
              minWidth: 44,
              height: 32,
              padding: "0 10px",
              fontSize: "var(--text-share-xs)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              lineHeight: 1,
              color: active ? TITLE_COLOR : MUTED,
              background: active ? "rgba(255,255,255,0.1)" : "transparent",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
*/

function CommentInput({
  value,
  onChange,
  placeholder,
  inputRef,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  inputRef?: RefObject<HTMLInputElement>;
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`${SHEET_FIELD_INPUT_CLASS} flex-1 min-w-0`}
      style={sheetFieldInputStyle({ padding: "10px 12px" })}
    />
  );
}

function BatchTotalsCommentSheet({
  open,
  onOpenChange,
  value,
  onChange,
  placeholder,
  doneLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  doneLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 flex flex-col justify-end pointer-events-auto"
      style={{ zIndex: 36 }}
      role="dialog"
      aria-modal="true"
      aria-label={placeholder}
    >
      <button
        type="button"
        aria-label="Close"
        className="mixer-input-sheet-dim absolute inset-0 border-0 p-0 cursor-default"
        onClick={() => onOpenChange(false)}
        style={{ backgroundColor: s.outsideDimMedium }}
      />
      <div
        className="mixer-input-sheet-panel relative flex flex-col min-w-0 overflow-hidden"
        style={{
          marginLeft: SHEET_MARGIN_X,
          marginRight: SHEET_MARGIN_X,
          marginBottom: SHEET_MARGIN_BOTTOM,
          borderRadius: SHEET_RADIUS,
          border: b.panel,
          background: c.entitySurfaceIdle,
          padding: `${SHEET_PAD_Y}px ${SHEET_PAD_X}px`,
          gap: 12,
        }}
      >
        <CommentInput
          inputRef={inputRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full rounded-xl transition-colors duration-150"
          style={{
            height: DONE_H,
            background: s.shareSubmitBg,
            border: b.panel,
            color: c.title,
            fontSize: "var(--text-share-sm)",
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.06em",
            cursor: "pointer",
          }}
        >
          {doneLabel}
        </button>
      </div>
    </div>
  );
}

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
      className="relative flex flex-col items-center justify-center overflow-hidden touch-none transition-colors duration-150 rounded-xl flex-1 h-full min-w-0"
      style={{
        cursor: "pointer",
        background: active ? s.shareSubmitBg : c.entitySurfaceIdle,
        border: active ? b.sharePanelActive : b.sharePanelIdle,
        color: active ? c.fill : c.muted,
        minHeight: 32,
      }}
    >
      {icon}
    </button>
  );
}

export interface BatchTotalsShareBarProps {
  recipe: BlendingRecipe;
  values: number[];
  complementValues: number[];
  entityIndexes: number[];
  multiplier: number;
}

export function BatchTotalsShareBar({
  recipe,
  values,
  complementValues,
  entityIndexes,
  multiplier,
}: BatchTotalsShareBarProps) {
  const shellCompact = useAppShellCompact();
  const [copied, setCopied] = useState(false);
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const language: BatchReportLanguage = "sv";
  // const [language, setLanguage] = useState<BatchReportLanguage>("sv");
  const [comment, setComment] = useState("");
  const labels = SHARE_LABELS[language];
  const commentPlaceholder = batchReportCommentPlaceholder(language);
  const commentDoneLabel = COMMENT_DONE_LABELS[language];
  const hasComment = comment.trim().length > 0;

  useEffect(() => {
    if (!shellCompact) setCommentSheetOpen(false);
  }, [shellCompact]);

  const reportText = useMemo(
    () =>
      buildBatchTotalsReportText(
        recipe,
        values,
        entityIndexes,
        multiplier,
        language,
        comment,
        complementValues,
      ),
    [recipe, values, entityIndexes, multiplier, language, comment, complementValues],
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

  return (
    <>
      <div className="flex flex-col items-stretch min-w-0 w-full" style={{ gap: "var(--action-row-gap)" }}>
        {!shellCompact ? (
          <div className="flex items-center gap-2 min-w-0 w-full">
            <CommentInput
              value={comment}
              onChange={setComment}
              placeholder={commentPlaceholder}
            />
            {/* <ReportLanguageToggle language={language} onChange={setLanguage} /> */}
          </div>
        ) : null}
        <div
          className="flex min-w-0 w-full"
          style={{ gap: "var(--action-row-gap)", height: "var(--action-row-h)" }}
        >
          {shellCompact ? (
            <ShareIconButton
              label={commentPlaceholder}
              onClick={() => setCommentSheetOpen(true)}
              icon={<RenameIcon />}
              active={hasComment}
            />
          ) : null}
          <ShareIconButton
            label={copied ? labels.copied : labels.copy}
            onClick={handleCopy}
            icon={copied ? <SavedIcon /> : <CopyIcon />}
            active={copied}
          />
          <ShareIconButton label={labels.mail} onClick={handleMail} icon={<MailIcon />} />
          <ShareIconButton label={labels.text} onClick={handleSms} icon={<MessageIcon />} />
        </div>
      </div>

      {shellCompact ? (
        <BatchTotalsCommentSheet
          open={commentSheetOpen}
          onOpenChange={setCommentSheetOpen}
          value={comment}
          onChange={setComment}
          placeholder={commentPlaceholder}
          doneLabel={commentDoneLabel}
        />
      ) : null}
    </>
  );
}
