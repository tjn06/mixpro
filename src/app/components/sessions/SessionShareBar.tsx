import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  batchReportCommentPlaceholder,
  type BatchReportLanguage,
} from "../../domain/batch-totals/report";
import {
  copyTextToClipboard,
  openMailWithReport,
  openSmsWithReport,
} from "../../domain/batch-totals/share";
import {
  buildSessionReportText,
  sessionReportSubject,
} from "../../domain/sessions/report";
import {
  SESSION_SHARE_SCOPE_ORDER,
  sessionShareHasContent,
  shareScopeEmptyHint,
  shareScopeHelperText,
  shareScopeLabel,
  stagesForShareScope,
  type SessionShareScope,
} from "../../domain/sessions/shareScope";
import type { BlendingRecipe } from "../../domain/recipe/types";
import type { MixSession } from "../../sessions/types";
import {
  CopyIcon,
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
    save: "Spara session",
    saved: "Sparad",
    copy: "Kopiera",
    copied: "Kopierad",
    mail: "E-post",
    text: "SMS",
    closeComment: "Stäng kommentar",
    scope: "Delningsomfång",
  },
  en: {
    save: "Save session",
    saved: "Saved",
    copy: "Copy",
    copied: "Copied",
    mail: "Mail",
    text: "Text",
    closeComment: "Close comment",
    scope: "Share scope",
  },
} as const;

function ShareIconButton({
  label,
  onClick,
  icon,
  active = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`batch-totals-dock-orb share-icon-btn relative flex flex-col items-center justify-center overflow-hidden touch-none transition-colors duration-150${
        active ? " share-icon-btn--active batch-totals-dock-orb--active" : ""
      }`}
      style={disabled ? { opacity: 0.45, cursor: "default" } : undefined}
    >
      {icon}
    </button>
  );
}

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

export function SessionShareBar({
  session,
  libraryRecipes,
  shareScope,
  onShareScopeChange,
  onSave,
  saveFlash = false,
  language = "en",
}: {
  session: MixSession;
  libraryRecipes: BlendingRecipe[];
  shareScope: SessionShareScope;
  onShareScopeChange: (scope: SessionShareScope) => void;
  onSave?: () => void;
  saveFlash?: boolean;
  language?: BatchReportLanguage;
}) {
  const [copied, setCopied] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const labels = SHARE_LABELS[language];
  const commentPlaceholder = batchReportCommentPlaceholder(language);
  const hasComment = comment.trim().length > 0;
  const activeStage = session.activeStage;
  const scopedStages = useMemo(
    () => stagesForShareScope(shareScope, activeStage),
    [shareScope, activeStage],
  );
  const canShare = sessionShareHasContent(session, scopedStages);
  const helper = canShare
    ? shareScopeHelperText(shareScope, activeStage, language)
    : shareScopeEmptyHint(language);

  const reportText = useMemo(
    () =>
      buildSessionReportText(
        session,
        libraryRecipes,
        language,
        comment,
        shareScope,
        activeStage,
      ),
    [session, libraryRecipes, language, comment, shareScope, activeStage],
  );

  const reportSubject = useMemo(
    () =>
      sessionReportSubject(session, language, comment, shareScope, activeStage),
    [session, language, comment, shareScope, activeStage],
  );

  const handleCopy = useCallback(async () => {
    if (!canShare) return;
    const ok = await copyTextToClipboard(reportText);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [canShare, reportText]);

  const handleMail = useCallback(() => {
    if (!canShare) return;
    openMailWithReport(reportSubject, reportText);
  }, [canShare, reportSubject, reportText]);

  const handleSms = useCallback(() => {
    if (!canShare) return;
    openSmsWithReport(reportText);
  }, [canShare, reportText]);

  const closeComment = useCallback(() => setCommentOpen(false), []);

  return (
    <div className="batch-totals-dock-actions flex flex-col items-stretch min-w-0 w-full">
      <section className="batch-totals-dock-module flex flex-col items-stretch min-w-0 w-full gap-2">
        <div className="session-share-scope">
          <div
            className="session-share-scope__segment"
            role="radiogroup"
            aria-label={labels.scope}
          >
            {SESSION_SHARE_SCOPE_ORDER.map((scope) => {
              const active = scope === shareScope;
              return (
                <button
                  key={scope}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className="session-share-scope__btn"
                  data-active={active ? "" : undefined}
                  onClick={() => onShareScopeChange(scope)}
                >
                  {shareScopeLabel(scope, language)}
                </button>
              );
            })}
          </div>
          <p className="session-share-scope__helper">{helper}</p>
        </div>

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
                disabled={!canShare}
              />
              <ShareIconButton
                label={labels.mail}
                onClick={handleMail}
                icon={<MailIcon />}
                disabled={!canShare}
              />
              <ShareIconButton
                label={labels.text}
                onClick={handleSms}
                icon={<MessageIcon />}
                disabled={!canShare}
              />
            </>
          )}
        </div>
      </section>

      {onSave ? (
        <div className="flex min-w-0 w-full" style={{ gap: 8 }}>
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
        </div>
      ) : null}
    </div>
  );
}
