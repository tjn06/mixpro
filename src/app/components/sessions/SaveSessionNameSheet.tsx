import { useEffect, useState } from "react";
import { CloseIcon, SaveIcon } from "../shared/ActionIcons";
import {
  SHEET_FIELD_INPUT_CLASS,
  SHEET_FIELD_LABEL_CLASS,
  SHEET_SUBTITLE_CLASS,
  SHEET_TITLE_CLASS,
  SHEET_COVER_FORM_HEADER_STYLE,
  SHEET_COVER_FORM_SPACING,
  sheetFieldInputStyle,
} from "../sheets/sheetChrome";
import { AppFrameCoverSheet } from "../sheets/AppFrameCoverSheet";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "../sheets/SheetCloseButton";

const INPUT_H = 40;
const FORM = SHEET_COVER_FORM_SPACING;
const SHEET_PAD_X = 20;

export function SaveSessionNameSheet({
  open,
  onOpenChange,
  initialName,
  onConfirm,
  title = "Save session",
  subtitle = "Name this project for your session list.",
  confirmLabel = "Save",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  onConfirm: (name: string) => void;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
}) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
  }, [open, initialName]);

  if (!open) return null;

  const trimmed = name.trim();
  const canConfirm = trimmed.length > 0;

  const handleSave = () => {
    if (!canConfirm) return;
    onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <AppFrameCoverSheet
      open={open}
      zIndex={41}
      ariaLabelledBy="save-session-name-title"
    >
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_FORM_HEADER_STYLE}
      >
        <h2 id="save-session-name-title" className={SHEET_TITLE_CLASS}>
          {title}
        </h2>
        <p className={SHEET_SUBTITLE_CLASS} style={{ maxWidth: 280, textAlign: "center" }}>
          {subtitle}
        </p>
      </header>

      <div
        className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-none"
        style={{ paddingLeft: SHEET_PAD_X, paddingRight: SHEET_PAD_X }}
      >
        <div
          className="shrink-0 w-full max-w-[360px] mx-auto"
          style={{ paddingBottom: FORM.formBottomInset, paddingTop: FORM.subtitleToSubinfo }}
        >
          <label
            htmlFor="save-session-name-input"
            className={SHEET_FIELD_LABEL_CLASS}
            style={{ display: "block", textAlign: "center", margin: 0 }}
          >
            Session name
          </label>
          <input
            id="save-session-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            className={SHEET_FIELD_INPUT_CLASS}
            style={{
              ...sheetFieldInputStyle({ height: INPUT_H, textAlign: "center" }),
              marginTop: FORM.labelToControl,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </div>
      </div>

      <SheetFooter
        buttons={[
          {
            key: "close",
            label: "Close",
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
          },
          {
            key: "save",
            label: confirmLabel,
            icon: <SaveIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: handleSave,
            disabled: !canConfirm,
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}
