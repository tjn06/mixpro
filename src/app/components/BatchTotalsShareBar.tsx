import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { BlendingRecipe } from "../recipeTypes";
import {
  batchReportCommentPlaceholder,
  batchTotalsReportSubject,
  buildBatchTotalsReportText,
  type BatchReportLanguage,
} from "../batchTotalsReport";
import {
  copyTextToClipboard,
  openMailWithReport,
  openSmsWithReport,
} from "../batchTotalsShare";
import { CopyIcon, MailIcon, MessageIcon, SavedIcon } from "./ActionIcons";

const PANEL_BORDER = "1.5px solid rgba(255,255,255,0.14)";
const MUTED = "#8888a8";
const TITLE_COLOR = "#c0c0e0";

const SHARE_LABELS = {
  sv: { copy: "Kopiera", copied: "Kopierad", mail: "E-post", text: "SMS" },
  en: { copy: "Copy", copied: "Copied", mail: "Mail", text: "Text" },
} as const;

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
      className="flex items-center justify-center gap-1 rounded-full"
      role="group"
      aria-label="Report language"
      style={{
        padding: 3,
        background: "rgba(255,255,255,0.04)",
        border: PANEL_BORDER,
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
              height: 24,
              padding: "0 10px",
              fontSize: 9,
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

function ShareButton({
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
      className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-150 active:scale-[0.98]"
      style={{
        height: 44,
        minWidth: 0,
        background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        border: PANEL_BORDER,
        color: active ? TITLE_COLOR : MUTED,
        cursor: "pointer",
      }}
    >
      {icon}
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.06em",
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </button>
  );
}

export interface BatchTotalsShareBarProps {
  recipe: BlendingRecipe;
  values: number[];
  entityIndexes: number[];
  multiplier: number;
  horizontalPad: number;
}

export function BatchTotalsShareBar({
  recipe,
  values,
  entityIndexes,
  multiplier,
  horizontalPad,
}: BatchTotalsShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<BatchReportLanguage>("sv");
  const [comment, setComment] = useState("");
  const labels = SHARE_LABELS[language];
  const commentPlaceholder = batchReportCommentPlaceholder(language);

  const reportText = useMemo(
    () =>
      buildBatchTotalsReportText(
        recipe,
        values,
        entityIndexes,
        multiplier,
        language,
        comment,
      ),
    [recipe, values, entityIndexes, multiplier, language, comment],
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
    <div
      className="shrink-0 flex flex-col items-stretch min-w-0"
      style={{ paddingLeft: horizontalPad, paddingRight: horizontalPad, paddingTop: 12, paddingBottom: 20, gap: 10 }}
    >
      <div className="flex items-center gap-2 min-w-0 w-full">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={commentPlaceholder}
          aria-label={commentPlaceholder}
          className="flex-1 min-w-0 rounded-xl outline-none"
          style={{
            boxSizing: "border-box",
            background: "rgba(255,255,255,0.04)",
            border: PANEL_BORDER,
            padding: "10px 12px",
            color: TITLE_COLOR,
            fontSize: 12,
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 500,
            letterSpacing: "0.03em",
            height: 36,
          }}
        />
        <div className="shrink-0">
          <ReportLanguageToggle language={language} onChange={setLanguage} />
        </div>
      </div>
      <div className="flex gap-2 min-w-0 w-full">
        <ShareButton
          label={copied ? labels.copied : labels.copy}
          onClick={handleCopy}
          icon={copied ? <SavedIcon size={16} /> : <CopyIcon size={16} />}
          active={copied}
        />
        <ShareButton label={labels.mail} onClick={handleMail} icon={<MailIcon size={16} />} />
        <ShareButton label={labels.text} onClick={handleSms} icon={<MessageIcon size={16} />} />
      </div>
    </div>
  );
}
