import { useMemo } from "react";
import type { BatchReportLanguage } from "../../domain/batch-totals/report";
import { ShareDeck } from "../share/ShareDeck";

/** Same session-stage share deck for catalog Select/Report. */
export function CatalogSharePanel({
  title,
  reportText,
  comment,
  onCommentChange,
  canShare,
  language,
}: {
  title: string;
  reportText: string;
  comment: string;
  onCommentChange: (next: string) => void;
  canShare: boolean;
  language?: BatchReportLanguage;
}) {
  const reportSubject = useMemo(() => {
    const trimmed = comment.trim();
    return trimmed || title;
  }, [comment, title]);

  return (
    <ShareDeck
      canShare={canShare}
      reportText={reportText}
      reportSubject={reportSubject}
      language={language}
      comment={comment}
      onCommentChange={onCommentChange}
    />
  );
}
