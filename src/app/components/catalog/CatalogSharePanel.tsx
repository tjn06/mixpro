import { useMemo } from "react";
import { ShareDeck } from "../share/ShareDeck";

/** Same session-stage share deck for catalog Select/Report. */
export function CatalogSharePanel({
  title,
  reportText,
  comment,
  onCommentChange,
  canShare,
}: {
  title: string;
  reportText: string;
  comment: string;
  onCommentChange: (next: string) => void;
  canShare: boolean;
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
      comment={comment}
      onCommentChange={onCommentChange}
    />
  );
}
