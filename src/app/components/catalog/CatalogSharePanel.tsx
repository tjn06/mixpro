import { useMemo, useState } from "react";
import { buildCatalogSelectionReport } from "../../domain/select/catalogMutations";
import { ShareDeck } from "../share/ShareDeck";

/** Same session-stage share deck for catalog Select/Report. */
export function CatalogSharePanel({
  title,
  selectedLabels,
}: {
  title: string;
  selectedLabels: readonly string[];
}) {
  const [comment, setComment] = useState("");
  const canShare = selectedLabels.length > 0;

  const reportText = useMemo(
    () =>
      buildCatalogSelectionReport({
        title,
        labels: selectedLabels,
        comment,
      }),
    [title, selectedLabels, comment],
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
