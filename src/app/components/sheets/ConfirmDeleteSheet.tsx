import { useTranslation } from "react-i18next";
import { DeleteIcon } from "../shared/ActionIcons";
import { ConfirmActionSheet } from "./ConfirmActionSheet";
import { SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";

/** In-app delete confirm — same cover chrome as other sheets (not native alert). */
export function ConfirmDeleteSheet({
  open,
  onOpenChange,
  itemLabel,
  title,
  body,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string;
  title?: string;
  body?: string;
  onConfirm: () => void;
}) {
  const { t } = useTranslation("common");
  const resolvedTitle = title ?? t("sheets.delete.title");
  const name = itemLabel || t("sheets.delete.fallbackName");
  const resolvedBody = body ?? t("sheets.delete.body", { name });

  return (
    <ConfirmActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title={resolvedTitle}
      body={resolvedBody}
      cancelLabel={t("common.close")}
      confirmLabel={t("common.delete")}
      confirmIcon={<DeleteIcon size={SHEET_FOOTER_ICON_SIZE} />}
      onConfirm={onConfirm}
    />
  );
}
