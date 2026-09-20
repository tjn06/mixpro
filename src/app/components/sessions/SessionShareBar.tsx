import { useMemo } from "react";
import type { BatchReportLanguage } from "../../domain/batch-totals/report";
import { SESSION_REPORT_LANGUAGE } from "../../domain/sessions/report";
import {
  SESSION_SHARE_SCOPE_ORDER,
  sessionShareHasContent,
  shareScopeLabel,
  stagesForShareScope,
  type SessionShareScope,
} from "../../domain/sessions/shareScope";
import type { MixSession } from "../../sessions/types";
import { SavedIcon } from "../shared/ActionIcons";
import { ShareDeck } from "../share/ShareDeck";

const SCOPE_CHECK_SIZE = 12;

const SCOPE_LABELS = {
  sv: { scope: "Delningsomfång", shareSteps: "Dela steg:" },
  en: { scope: "Share scope", shareSteps: "Share steps:" },
} as const;

export function SessionShareBar({
  session,
  shareScope,
  onShareScopeChange,
  reportText,
  reportSubject,
  comment,
  onCommentChange,
  onSave,
  saveFlash = false,
  /** Report + share-chrome language. Default Swedish; pass `"en"` when switch is added. */
  language = SESSION_REPORT_LANGUAGE,
  dayFilter = "all",
}: {
  session: MixSession;
  shareScope: SessionShareScope;
  onShareScopeChange: (scope: SessionShareScope) => void;
  reportText: string;
  reportSubject: string;
  comment: string;
  onCommentChange: (next: string) => void;
  onSave?: () => void;
  saveFlash?: boolean;
  language?: BatchReportLanguage;
  /** `"all"` or `yyyy-MM-dd` — matches the session day filter badges. */
  dayFilter?: string;
}) {
  const scopeLabels = SCOPE_LABELS[language];
  const activeStage = session.activeStage;
  const scopedStages = useMemo(
    () => stagesForShareScope(shareScope, activeStage),
    [shareScope, activeStage],
  );
  const canShare = sessionShareHasContent(session, scopedStages, dayFilter);

  return (
    <ShareDeck
      canShare={canShare}
      reportText={reportText}
      reportSubject={reportSubject}
      language={language}
      comment={comment}
      onCommentChange={onCommentChange}
      editAriaLabel={scopeLabels.scope}
      onSave={onSave}
      saveFlash={saveFlash}
      editExtras={({ commentOpen }) => (
        <div
          className="session-share-scope__segment"
          role="radiogroup"
          aria-label={scopeLabels.scope}
        >
          <span className="session-share-scope__prefix">
            {scopeLabels.shareSteps}
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
      )}
    />
  );
}
