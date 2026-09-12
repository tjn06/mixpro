import { useMemo, useState } from "react";
import { buildCatalogSelectionReport } from "../../domain/select/catalogMutations";
import { ShareDeck } from "../share/ShareDeck";

/** Same session-stage share deck for catalog Select/Report. */
export function CatalogSharePanel({
  title,
  selectedLabels,
  workDateId = null,
}: {
  title: string;
  selectedLabels: readonly string[];
  /** Optional report date — omitted from share text when unset. */
  workDateId?: string | null;
}) {
  const [comment, setComment] = useState("");
  const canShare = selectedLabels.length > 0;

  const reportText = useMemo(
    () =>
      buildCatalogSelectionReport({
        title,
        labels: selectedLabels,
        comment,
        workDateId,
      }),
    [title, selectedLabels, comment, workDateId],
  );

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
      onCommentChange={setComment}
    />
  );
}
