import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon, MessageIcon, SaveIcon } from "../shared/ActionIcons";
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
const FORM = SHEET_COVER_FORM_SPACING;

/**
 * Rental line comment — auto-focuses the field only when empty so existing
 * notes aren’t jumped into edit mode on open.
 */
export function ToolRentalCommentSheet({
  open,
  onOpenChange,
  toolLabel,
  initialComment,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolLabel: string;
  initialComment: string;
  onSave: (comment: string | null) => void;
}) {
  const { t } = useTranslation("common");
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(initialComment);
  const hadCommentOnOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    const existing = initialComment.trim();
    hadCommentOnOpen.current = existing.length > 0;
    setDraft(initialComment);
  }, [open, initialComment]);

  useEffect(() => {
    if (!open) return;
    if (hadCommentOnOpen.current) return;
    const id = window.setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }, 60);
    return () => window.clearTimeout(id);
  }, [open]);

  const baseline = initialComment.trim();
  const canSave = draft.trim() !== baseline;

  const commit = () => {
    if (!canSave) return;
    const trimmed = draft.trim();
    onSave(trimmed ? trimmed : null);
    onOpenChange(false);
  };

  return (
    <AppFrameCoverSheet open={open} zIndex={90} ariaLabelledBy={titleId}>
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_FORM_HEADER_STYLE}
      >
        <h2 id={titleId} className={SHEET_TITLE_CLASS}>
          {t("sheets.rentalComment.title")}
        </h2>
        <p
          className={SHEET_SUBTITLE_CLASS}
          style={{ maxWidth: 280, textAlign: "center" }}
        >
          Optional note for this rented tool — supplier, pickup, return…
        </p>
      </header>

      <div
        className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-none"
        style={{ paddingLeft: SHEET_PAD_X, paddingRight: SHEET_PAD_X }}
      >
        <div
          className="shrink-0 w-full max-w-[360px] mx-auto"
          style={{ paddingTop: FORM.subtitleToSubinfo }}
        >
          <p
            className={SHEET_FIELD_LABEL_CLASS}
            style={{ display: "block", textAlign: "center", margin: 0 }}
          >
            {t("sheets.rentalComment.tool")}
          </p>
          <p
            className="truncate min-w-0"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "var(--text-recipe-meta-value)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "var(--semantic-text-primary)",
              lineHeight: 1.35,
              margin: `${FORM.labelToControl}px 0 0`,
              textAlign: "center",
            }}
          >
            {toolLabel}
          </p>
        </div>

        <div
          className="flex-1 min-h-0"
          style={{ minHeight: FORM.thumbZoneMinGap }}
          aria-hidden
        />

        <div
          className="shrink-0 w-full max-w-[360px] mx-auto"
          style={{ paddingBottom: FORM.formBottomInset }}
        >
          <label
            htmlFor="rental-comment-field"
            className={SHEET_FIELD_LABEL_CLASS}
            style={{ display: "block", textAlign: "center", margin: 0 }}
          >
            {t("sheets.rentalComment.label")}
          </label>
          <textarea
            ref={inputRef}
            id="rental-comment-field"
            className={SHEET_FIELD_INPUT_CLASS}
            style={{
              ...sheetFieldInputStyle({
                height: "auto",
                minHeight: 112,
                paddingBlock: 12,
                marginTop: FORM.labelToControl,
              }),
              resize: "vertical",
            }}
            value={draft}
            maxLength={280}
            rows={4}
            placeholder={t("sheets.rentalComment.placeholder")}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
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
            key: "save",
            label: t("common.save"),
            icon: <SaveIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: commit,
            variant: "primary",
            disabled: !canSave,
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}

/** Compact comment control fused to a rented chip. */
export function RentalCommentButton({
  hasComment,
  disabled,
  onClick,
}: {
  hasComment: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation("common");
  const label = hasComment
    ? t("sheets.rentalComment.edit")
    : t("sheets.rentalComment.add");

  return (
    <button
      type="button"
      className="select-chip__comment-btn"
      data-has-comment={hasComment ? "" : undefined}
      disabled={disabled}
      aria-label={label}
      title={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <MessageIcon size={14} />
    </button>
  );
}
