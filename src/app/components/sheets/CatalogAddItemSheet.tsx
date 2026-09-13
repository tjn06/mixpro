import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { bilingualFromFields, type LocalizedLabel } from "../../i18n/localizedLabel";
import { CloseIcon } from "../shared/ActionIcons";
import {
  SHEET_COVER_FORM_HEADER_STYLE,
  SHEET_COVER_FORM_SPACING,
  SHEET_FIELD_INPUT_CLASS,
  SHEET_FIELD_LABEL_CLASS,
  SHEET_SUBTITLE_CLASS,
  SHEET_TITLE_CLASS,
  sheetFieldInputStyle,
} from "./sheetChrome";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";

const SHEET_PAD_X = 20;
const INPUT_H = 44;
const FORM = SHEET_COVER_FORM_SPACING;

/** Add a bilingual catalog item (English and/or Swedish). */
export function CatalogAddItemSheet({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (label: LocalizedLabel) => void;
}) {
  const { t } = useTranslation("common");
  const titleId = useId();
  const enRef = useRef<HTMLInputElement>(null);
  const [draftEn, setDraftEn] = useState("");
  const [draftSv, setDraftSv] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraftEn("");
    setDraftSv("");
    const id = window.setTimeout(() => {
      enRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(id);
  }, [open]);

  const next = bilingualFromFields(draftEn, draftSv);
  const canAdd = next != null;

  const commit = () => {
    if (!next) return;
    onConfirm(next);
    onOpenChange(false);
  };

  return (
    <AppFrameCoverSheet open={open} zIndex={90} ariaLabelledBy={titleId}>
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_FORM_HEADER_STYLE}
      >
        <h2 id={titleId} className={SHEET_TITLE_CLASS}>
          {t("sheets.catalogAdd.title")}
        </h2>
        <p
          className={SHEET_SUBTITLE_CLASS}
          style={{ maxWidth: 300, textAlign: "center" }}
        >
          {t("sheets.catalogAdd.subtitle")}
        </p>
      </header>

      <div
        className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-none"
        style={{ paddingLeft: SHEET_PAD_X, paddingRight: SHEET_PAD_X }}
      >
        <div
          className="flex-1 min-h-0"
          style={{ minHeight: FORM.thumbZoneMinGap }}
          aria-hidden
        />

        <form
          className="shrink-0 w-full max-w-[360px] mx-auto flex flex-col"
          style={{
            gap: FORM.controlToAction,
            paddingBottom: FORM.formBottomInset,
          }}
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
        >
          <label className="flex flex-col" style={{ gap: FORM.labelToControl }}>
            <span
              className={SHEET_FIELD_LABEL_CLASS}
              style={{ display: "block", textAlign: "center", margin: 0 }}
            >
              {t("catalog.edit.nameEn")}
            </span>
            <input
              ref={enRef}
              id="catalog-add-en"
              type="text"
              className={SHEET_FIELD_INPUT_CLASS}
              style={sheetFieldInputStyle({ height: INPUT_H, textAlign: "center" })}
              value={draftEn}
              onChange={(e) => setDraftEn(e.target.value)}
              placeholder={t("catalog.edit.placeholderEn")}
              maxLength={48}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="next"
            />
          </label>

          <label className="flex flex-col" style={{ gap: FORM.labelToControl }}>
            <span
              className={SHEET_FIELD_LABEL_CLASS}
              style={{ display: "block", textAlign: "center", margin: 0 }}
            >
              {t("catalog.edit.nameSv")}
            </span>
            <input
              id="catalog-add-sv"
              type="text"
              className={SHEET_FIELD_INPUT_CLASS}
              style={sheetFieldInputStyle({ height: INPUT_H, textAlign: "center" })}
              value={draftSv}
              onChange={(e) => setDraftSv(e.target.value)}
              placeholder={t("catalog.edit.placeholderSv")}
              maxLength={48}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
            />
          </label>
        </form>
      </div>

      <SheetFooter
        buttons={[
          {
            key: "close",
            label: t("common.close"),
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
            variant: "secondary",
          },
          {
            key: "add",
            label: t("catalog.edit.add"),
            icon: <Plus size={SHEET_FOOTER_ICON_SIZE} strokeWidth={2.25} aria-hidden />,
            onClick: commit,
            variant: "primary",
            disabled: !canAdd,
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}
