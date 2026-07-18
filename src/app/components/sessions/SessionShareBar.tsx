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
import { SHEET_FOOTER_BTN_H, SHEET_FOOTER_ICON_SIZE } from "../sheets/SheetCloseButton";

const SCOPE_CHECK_SIZE = 12;

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
    shareSteps: "Dela steg:",
    commentField: "Kommentar / titel",
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
    shareSteps: "Share steps:",
    commentField: "Comment / title",
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
      className={`batch-totals-dock-orb share-icon-btn relative flex flex-col items-center justify-center overflow-hidden transition-colors duration-150${
        active ? " share-icon-btn--active batch-totals-dock-orb--active" : ""
      }${disabled ? " batch-totals-dock-orb--disabled" : ""}`}
    >
      {icon}
    </button>
  );
}

function CommentUnderlineField({
  value,
  onChange,
  onClose,
  placeholder,
  active,
}: {
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
  placeholder: string;
  active: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [active]);

  return (
    <div className="session-share-scope__underline-field">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="session-share-scope__underline-input"
        tabIndex={active ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      />
    </div>
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

  const closeComment = useCallback(() => {
    setCommentOpen(false);
  }, []);

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

  return (
    <div className="batch-totals-dock-actions flex flex-col items-stretch min-w-0 w-full">
      <section
        className="batch-totals-dock-module session-share-dock min-w-0 w-full"
        data-edit-open={commentOpen ? "" : undefined}
      >
        <div className="session-share-dock__body">
          {/* Pen stays outside the sliding stage — one instance, never translated. */}
          <div className="session-share-dock__row">
            <div className="session-share-dock__pen">
              <ShareIconButton
                label={commentOpen ? labels.closeComment : commentPlaceholder}
                onClick={() => setCommentOpen((open) => !open)}
                icon={<RenameIcon />}
                active={commentOpen || hasComment}
              />
            </div>

            <div className="session-share-dock__stage">
              <div className="session-share-dock__actions">
                <ShareIconButton
                  label={copied ? labels.copied : labels.copy}
                  onClick={handleCopy}
                  icon={copied ? <SavedIcon /> : <CopyIcon />}
                  active={copied}
                  disabled={!canShare || commentOpen}
                />
                <ShareIconButton
                  label={labels.mail}
                  onClick={handleMail}
                  icon={<MailIcon />}
                  disabled={!canShare || commentOpen}
                />
                <ShareIconButton
                  label={labels.text}
                  onClick={handleSms}
                  icon={<MessageIcon />}
                  disabled={!canShare || commentOpen}
                />
              </div>

              <div
                className="session-share-dock__edit"
                data-open={commentOpen ? "" : undefined}
                role="dialog"
                aria-label={labels.scope}
                aria-hidden={!commentOpen}
              >
                <div className="session-share-scope__panel-main">
                  <CommentUnderlineField
                    value={comment}
                    onChange={setComment}
                    onClose={closeComment}
                    placeholder={labels.commentField}
                    active={commentOpen}
                  />
                  <div
                    className="session-share-scope__segment"
                    role="radiogroup"
                    aria-label={labels.scope}
                  >
                    <span className="session-share-scope__prefix">
                      {labels.shareSteps}
                    </span>
                    <div className="session-share-scope__options">
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
                            tabIndex={commentOpen ? 0 : -1}
                            onClick={() => onShareScopeChange(scope)}
                          >
                            <span
                              className="session-share-scope__check"
                              aria-hidden="true"
                            >
                              <SavedIcon size={SCOPE_CHECK_SIZE} />
                            </span>
                            <span className="session-share-scope__btn-label">
                              {shareScopeLabel(scope, language)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
