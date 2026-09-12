import { ChevronDown, Plus } from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  selectionLineKey,
  type ItemAcquisition,
} from "../../domain/select/acquisition";
import {
  headSlotId,
  newCloneSlotId,
  reconcileDropdownSlots,
  type DropdownSlot,
} from "../../domain/select/dropdownSlots";
import {
  bumpFlexSelectQty,
  ensureFlexSelectSelected,
  flexSelectQty,
  setFlexSelectQty,
  type FlexSelectSelection,
} from "../../domain/select/selection";
import {
  SELECT_CHIPS_DENSE,
  applyDenseSelectRowGaps,
  clearDenseSelectRowGaps,
  denseChipFontStyle,
} from "../../domain/select/denseChips";
import {
  flexSelectItemHasOptions,
  optionIdsForItem,
  type FlexSelectItem,
} from "../../domain/select/types";
import {
  WEAR_LEVEL_LABELS,
  WEAR_LEVELS,
  WEAR_PLACEHOLDER_LABEL,
  pruneWearByOptionId,
  setWearForOption,
  type WearByOptionId,
  type WearLevel,
} from "../../domain/select/wear";
import type { AppLanguage } from "../../i18n/language";
import {
  displayLabel,
  type ItemLabel,
} from "../../i18n/localizedLabel";
import { useSettingsStore } from "../../settings/store";
import { DeleteIcon } from "../shared/ActionIcons";
import { ConfirmDeleteSheet } from "../sheets/ConfirmDeleteSheet";
import {
  RentalCommentButton,
  ToolRentalCommentSheet,
} from "../sheets/ToolRentalCommentSheet";
import {
  SELECT_CHIP_DOUBLE_TAP_MS,
  useSelectChipGestures,
} from "./useSelectChipGestures";

const CHEVRON_SIZE = 14;
const PLUS_SIZE = 14;
const CLONE_PLUS_SIZE = 20;
const MENU_GAP_PX = 4;

/** Widest label by character length (stable closed-chip width for number suffixes). */
function widestOptionLabel(
  familyLabel: ItemLabel,
  options: readonly FlexSelectItem[] | undefined,
  language: AppLanguage,
): string {
  let widest = displayLabel(familyLabel, language);
  for (const option of options ?? []) {
    const text = displayLabel(option.label, language);
    if (text.length > widest.length) widest = text;
  }
  return widest;
}

function SelectDropdownChip({
  item,
  selectedOption,
  qty,
  open,
  onOpenChange,
  onPickOption,
  onUnselect,
  onIncrement,
  onDecrement,
  unselectLabel,
  takenOptionIds,
}: {
  item: FlexSelectItem;
  selectedOption: FlexSelectItem | null;
  qty: number;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onPickOption: (optionId: string) => void;
  onUnselect: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  unselectLabel: string;
  /** Variant ids already used by sibling slots (disabled in menu). */
  takenOptionIds: ReadonlySet<string>;
}) {
  const { t } = useTranslation("common");
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const itemText = displayLabel(item.label, uiLanguage);
  const selectedOptionText = selectedOption
    ? displayLabel(selectedOption.label, uiLanguage)
    : null;
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const deferOpenRef = useRef<number | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const listboxId = useId();
  const selected = selectedOption != null;
  const widthSizerLabel = useMemo(
    () => widestOptionLabel(item.label, item.children, uiLanguage),
    [item.label, item.children, uiLanguage],
  );

  const clearDeferOpen = useCallback(() => {
    if (deferOpenRef.current != null) {
      window.clearTimeout(deferOpenRef.current);
      deferOpenRef.current = null;
    }
  }, []);

  useEffect(() => () => clearDeferOpen(), [clearDeferOpen]);

  const updateMenuPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportPad = 8;
    const width = rect.width;
    let left = rect.left;
    if (left + width > window.innerWidth - viewportPad) {
      left = Math.max(viewportPad, window.innerWidth - viewportPad - width);
    }
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + MENU_GAP_PX,
      left,
      width,
      zIndex: 80,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, selectedOption?.id, item.label, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updateMenuPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const gestures = useSelectChipGestures({
    enabled: !open,
    mode: selected && !open ? "qty" : "select",
    onTap: () => {
      if (open) {
        onOpenChange(false);
        return;
      }
      if (!selected) {
        onOpenChange(true);
        return;
      }
      clearDeferOpen();
      deferOpenRef.current = window.setTimeout(() => {
        deferOpenRef.current = null;
        onOpenChange(true);
      }, SELECT_CHIP_DOUBLE_TAP_MS);
    },
    onDoubleTap: () => {
      clearDeferOpen();
      onIncrement();
    },
    onLongPress: () => {
      clearDeferOpen();
      onDecrement();
    },
  });

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            className="select-chip-menu"
            style={menuStyle}
            role="listbox"
            aria-label={itemText}
          >
            {item.children?.map((option) => {
              const active = selectedOption?.id === option.id;
              const taken = !active && takenOptionIds.has(option.id);
              const optionText = displayLabel(option.label, uiLanguage);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-disabled={taken || undefined}
                  className="select-chip-menu__option"
                  data-active={active ? "" : undefined}
                  data-taken={taken ? "" : undefined}
                  disabled={taken}
                  onClick={() => {
                    if (taken) return;
                    onPickOption(option.id);
                  }}
                >
                  {optionText}
                </button>
              );
            })}
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="select-chip-menu__option select-chip-menu__option--unselect"
              disabled={!selected}
              onClick={() => onUnselect()}
            >
              {unselectLabel}
            </button>
          </div>,
          document.body,
        )
      : null;

  const ariaLabel = selectedOption && selectedOptionText
    ? qty > 1
      ? t("select.optionQtyAria", {
          item: itemText,
          option: selectedOptionText,
          qty,
        })
      : t("select.optionAria", {
          item: itemText,
          option: selectedOptionText,
        })
    : itemText;

  return (
    <div className="select-chip-anchor" ref={anchorRef}>
      <button
        type="button"
        className="select-chip select-chip--select"
        data-selected={selected ? "" : undefined}
        data-family={selectedOption ? itemText : undefined}
        data-qty={qty > 1 ? String(qty) : undefined}
        data-open={open ? "" : undefined}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        {...gestures}
      >
        <span className="select-chip__label-stack">
          <span className="select-chip__width-sizer" aria-hidden>
            {widthSizerLabel}
          </span>
          <span className="select-chip__group-label">
            {selectedOptionText ?? itemText}
          </span>
        </span>
        <span className="select-chip__chevron" aria-hidden>
          <ChevronDown size={CHEVRON_SIZE} strokeWidth={2} />
        </span>
      </button>
      {menu}
    </div>
  );
}

function CustomDeleteButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const { t } = useTranslation("common");
  const deleteLabel = t("select.deleteAria", { name: label });
  return (
    <button
      type="button"
      className="select-chip__delete-btn"
      aria-label={deleteLabel}
      title={deleteLabel}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <DeleteIcon size={14} />
    </button>
  );
}

function SimpleSelectChip({
  label,
  qty,
  rented = false,
  allowRetapSelect = false,
  disabled = false,
  hasComment = false,
  onCommentClick,
  onRemove,
  onSelect,
  onIncrement,
  onDecrement,
}: {
  label: string;
  qty: number;
  rented?: boolean;
  /** When true, tap still runs onSelect even if this chip looks selected. */
  allowRetapSelect?: boolean;
  /**
   * Owned catalog copy beside a rented selection — muted + non-interactive
   * while rental arm is on.
   */
  disabled?: boolean;
  hasComment?: boolean;
  onCommentClick?: () => void;
  /** Custom session/report items — fused trailing delete. */
  onRemove?: () => void;
  onSelect: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const { t } = useTranslation("common");
  const selected = qty >= 1;
  const qtyGestures = selected && !allowRetapSelect && !disabled;
  const gestures = useSelectChipGestures({
    enabled: !disabled,
    mode: qtyGestures ? "qty" : "select",
    onTap: () => {
      if (disabled) return;
      if (!selected || allowRetapSelect) onSelect();
    },
    onDoubleTap: disabled ? () => {} : onIncrement,
    onLongPress: disabled ? () => {} : onDecrement,
  });

  const ariaName = rented
    ? `${label}, ${t("select.rented")}`
    : label;
  const chipAria =
    selected && qty > 1
      ? t("select.qtyAria", { label: ariaName, qty })
      : ariaName;
  const showComment = Boolean(rented && selected && onCommentClick);
  const showDelete = Boolean(onRemove);
  const fused = showComment || showDelete;
  const denseFontStyle = denseChipFontStyle(label);

  const main = (
    <button
      type="button"
      className={
        fused ? "select-chip select-chip--rental-main" : "select-chip"
      }
      data-selected={selected ? "" : undefined}
      data-qty={!fused && qty > 1 ? String(qty) : undefined}
      data-rented={rented && !fused ? "" : undefined}
      data-arm-muted={disabled ? "" : undefined}
      data-comment={
        !fused && hasComment && rented ? "\u2713" : undefined
      }
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      aria-label={chipAria}
      style={denseFontStyle}
      {...gestures}
    >
      <span className="select-chip__label">{label}</span>
    </button>
  );

  if (!fused) return main;

  return (
    <div
      className={
        rented || showComment
          ? "select-chip-rental"
          : "select-chip-deletable"
      }
      data-selected={selected ? "" : undefined}
      data-rented={rented ? "" : undefined}
      data-qty={qty > 1 ? String(qty) : undefined}
      data-comment={hasComment ? "\u2713" : undefined}
    >
      {main}
      {showComment ? (
        <RentalCommentButton
          hasComment={hasComment}
          onClick={onCommentClick!}
        />
      ) : null}
      {showDelete ? <CustomDeleteButton label={label} onClick={onRemove!} /> : null}
    </div>
  );
}

function RentedArmControl({
  armed,
  onArmedChange,
}: {
  armed: boolean;
  onArmedChange: (next: boolean) => void;
}) {
  const { t } = useTranslation("common");
  return (
    <button
      type="button"
      role="switch"
      className="select-chip select-chip--rented-arm"
      data-selected={armed ? "" : undefined}
      aria-checked={armed}
      aria-label={
        armed ? t("select.rentedOnAria") : t("select.rentedOffAria")
      }
      title={armed ? t("select.rentedOn") : t("select.rentedOff")}
      onClick={() => onArmedChange(!armed)}
    >
      <span className="select-chip__rented-arm-label">{t("select.rented")}</span>
      <span className="select-chip__rented-switch" aria-hidden>
        <span className="select-chip__rented-switch-thumb" />
      </span>
    </button>
  );
}

function AddSimpleItemControl({
  label,
  placeholder,
  onAdd,
}: {
  label: string;
  placeholder: string;
  onAdd: (name: string) => void;
}) {
  const { t } = useTranslation("common");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!composing) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [composing]);

  const commit = () => {
    const name = draft.trim();
    if (!name) {
      setComposing(false);
      setDraft("");
      return;
    }
    onAdd(name);
    setDraft("");
    setComposing(false);
  };

  if (!composing) {
    return (
      <button
        type="button"
        className="select-chip select-chip--add"
        onClick={() => setComposing(true)}
      >
        <Plus size={PLUS_SIZE} strokeWidth={2.25} aria-hidden />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <form
      className="select-chip select-chip--add-compose"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        commit();
      }}
    >
      <input
        ref={inputRef}
        type="text"
        className="select-chip__add-input"
        value={draft}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={48}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setComposing(false);
            setDraft("");
          }
        }}
        onBlur={() => {
          if (!draft.trim()) {
            setComposing(false);
            setDraft("");
          }
        }}
      />
      <button type="submit" className="select-chip__add-confirm">
        {t("select.add")}
      </button>
    </form>
  );
}

/** Icon-only + that spawns a linked clone chip for another variant. */
function DropdownClonePlusButton({
  familyLabel,
  disabled,
  onClick,
}: {
  familyLabel: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation("common");
  return (
    <button
      type="button"
      className="select-chip select-chip--clone-plus"
      disabled={disabled}
      aria-label={t("select.addAnother", { family: familyLabel })}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      <Plus size={CLONE_PLUS_SIZE} strokeWidth={2.5} aria-hidden />
    </button>
  );
}

/** Slitage picker — own hit target; column reserved before a variant is picked. */
function WearSelectControl({
  value,
  open,
  disabled = false,
  onOpenChange,
  onPick,
}: {
  value: WearLevel | null;
  open: boolean;
  disabled?: boolean;
  onOpenChange: (next: boolean) => void;
  onPick: (level: WearLevel) => void;
}) {
  const { t } = useTranslation("common");
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const listboxId = useId();

  const updateMenuPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.max(rect.width, 72);
    let left = rect.left;
    const viewportPad = 8;
    if (left + width > window.innerWidth - viewportPad) {
      left = Math.max(viewportPad, window.innerWidth - viewportPad - width);
    }
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + MENU_GAP_PX,
      left,
      width,
      zIndex: 81,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updateMenuPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const wearTitle = t("wear.title");
  const menu =
    open && !disabled && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            className="select-chip-menu select-chip-menu--wear"
            style={menuStyle}
            role="listbox"
            aria-label={wearTitle}
          >
            {WEAR_LEVELS.map((level) => {
              const active = value === level;
              return (
                <button
                  key={level}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={t(`wear.${level}`)}
                  className="select-chip-menu__option"
                  data-active={active ? "" : undefined}
                  onClick={() => {
                    onPick(level);
                    onOpenChange(false);
                  }}
                >
                  {WEAR_LEVEL_LABELS[level]}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className="select-chip select-chip--wear"
        data-wear-title={disabled ? undefined : wearTitle}
        data-selected={value ? "" : undefined}
        data-open={open ? "" : undefined}
        data-reserved={!value && !disabled ? "" : undefined}
        disabled={disabled}
        aria-label={
          value
            ? t("wear.withLevel", { level: t(`wear.${value}`) })
            : t("wear.choose")
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => {
          if (disabled) return;
          onOpenChange(!open);
        }}
      >
        <span className="select-chip__wear-label">
          {value ? WEAR_LEVEL_LABELS[value] : WEAR_PLACEHOLDER_LABEL}
        </span>
        <span className="select-chip__chevron select-chip__wear-chevron" aria-hidden>
          <ChevronDown size={CHEVRON_SIZE} strokeWidth={2} />
        </span>
      </button>
      {menu}
    </>
  );
}

export function FlexSelectView({
  items,
  selection,
  onSelectionChange,
  wearByOptionId,
  onWearChange,
  className,
  tone = "default",
  unselectLabel,
  addSimpleLabel,
  addSimplePlaceholder,
  onAddSimpleItem,
  customItemIds,
  onRemoveCustomItem,
  acquisitionEnabled = false,
  commentsByLineKey,
  onRentalCommentChange,
  "aria-label": ariaLabel,
}: {
  items: readonly FlexSelectItem[];
  selection: FlexSelectSelection;
  onSelectionChange: (next: Record<string, number>) => void;
  /** Slitage map for abrasive consumables (optional — tools omit). */
  wearByOptionId?: WearByOptionId;
  onWearChange?: (next: Record<string, WearLevel>) => void;
  className?: string;
  /** Session stages only — teal accent. Hub Report uses default app selection. */
  tone?: "default" | "session";
  unselectLabel?: string;
  /** When set, shows a standout control to add a simple (non-dropdown) item. */
  onAddSimpleItem?: (label: string, acquisition: ItemAcquisition) => void;
  addSimpleLabel?: string;
  addSimplePlaceholder?: string;
  /** Session / Report custom item ids — fused delete when `onRemoveCustomItem` set. */
  customItemIds?: ReadonlySet<string>;
  onRemoveCustomItem?: (id: string) => void;
  /**
   * Tools session: dashed Rented arm after Custom. Armed picks write rented
   * lines; the clicked chip becomes yellow in place and an owned catalog copy
   * is appended after (disabled while the rental arm is on).
   */
  acquisitionEnabled?: boolean;
  /** Rental-line comments keyed by selection line id (`acq:rented:…`). */
  commentsByLineKey?: Readonly<Record<string, string>>;
  onRentalCommentChange?: (lineKey: string, comment: string | null) => void;
  "aria-label"?: string;
}) {
  const { t } = useTranslation("common");
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const resolvedUnselectLabel = unselectLabel ?? t("select.unselect");
  const resolvedAddSimpleLabel = addSimpleLabel ?? t("catalog.custom");
  const resolvedAddSimplePlaceholder =
    addSimplePlaceholder ?? t("select.customPlaceholder");
  const resolvedAriaLabel = ariaLabel ?? t("select.selectItems");
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [openWearOptionId, setOpenWearOptionId] = useState<string | null>(null);
  const [rentalArmed, setRentalArmed] = useState(false);
  const [commentTarget, setCommentTarget] = useState<{
    lineKey: string;
    label: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const wearEnabled = onWearChange != null;
  const commentsEnabled = onRentalCommentChange != null;
  const acquisition: ItemAcquisition =
    acquisitionEnabled && rentalArmed ? "rented" : "owned";
  /** Linked clone chips live here — never added to catalog `items` / sort. */
  const [slotsByParent, setSlotsByParent] = useState<
    Record<string, DropdownSlot[]>
  >({});
  /** Catalog / library order — do not re-sort by label length. */
  const displayItems = items;
  const viewRef = useRef<HTMLElement>(null);

  /** Dense experiment: redistribute leftover row width into horizontal gaps. */
  useLayoutEffect(() => {
    const root = viewRef.current;
    if (!root || !SELECT_CHIPS_DENSE) return;

    const run = () => applyDenseSelectRowGaps(root);
    run();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    ro?.observe(root);
    window.addEventListener("resize", run);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", run);
      clearDenseSelectRowGaps(root);
    };
  }, [displayItems, selection, slotsByParent, rentalArmed, wearByOptionId]);

  const openRentalComment = useCallback((lineKey: string, label: string) => {
    setCommentTarget({ lineKey, label });
  }, []);

  useEffect(() => {
    if (!acquisitionEnabled && rentalArmed) setRentalArmed(false);
  }, [acquisitionEnabled, rentalArmed]);

  useEffect(() => {
    setSlotsByParent((prev) => {
      let changed = false;
      const next: Record<string, DropdownSlot[]> = { ...prev };
      const liveParentIds = new Set<string>();

      for (const item of items) {
        if (!flexSelectItemHasOptions(item)) continue;
        liveParentIds.add(item.id);
        const reconciled = reconcileDropdownSlots(
          item,
          selection,
          prev[item.id],
        );
        const before = prev[item.id];
        if (
          !before ||
          before.length !== reconciled.length ||
          before.some(
            (slot, i) =>
              slot.id !== reconciled[i]?.id ||
              slot.optionId !== reconciled[i]?.optionId,
          )
        ) {
          next[item.id] = reconciled;
          changed = true;
        }
      }

      for (const parentId of Object.keys(next)) {
        if (!liveParentIds.has(parentId)) {
          delete next[parentId];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [items, selection]);

  const pickOptionForSlot = useCallback(
    (
      parent: FlexSelectItem,
      slotId: string,
      prevOptionId: string | null,
      optionId: string,
    ) => {
      if (acquisition === "rented") {
        const rentedKey = selectionLineKey(optionId, "rented");
        onSelectionChange(ensureFlexSelectSelected(selection, rentedKey));
        setOpenSlotId(null);
        return;
      }

      setSlotsByParent((prev) => {
        const slots = prev[parent.id] ?? [];
        return {
          ...prev,
          [parent.id]: slots.map((slot) =>
            slot.id === slotId ? { ...slot, optionId } : slot,
          ),
        };
      });

      const keepQty =
        prevOptionId != null ? flexSelectQty(selection, prevOptionId) : 0;
      let next: Record<string, number> = { ...selection };
      if (prevOptionId && prevOptionId !== optionId) {
        delete next[prevOptionId];
      }
      delete next[parent.id];
      next = setFlexSelectQty(next, optionId, keepQty >= 1 ? keepQty : 1);
      onSelectionChange(next);
      setOpenSlotId(null);

      if (wearEnabled && parent.requiresWear && onWearChange) {
        const removeIds =
          prevOptionId && prevOptionId !== optionId ? [prevOptionId] : [];
        onWearChange(
          pruneWearByOptionId(wearByOptionId, next, removeIds),
        );
        setOpenWearOptionId(optionId);
      }
    },
    [
      acquisition,
      onSelectionChange,
      onWearChange,
      selection,
      wearByOptionId,
      wearEnabled,
    ],
  );

  const unselectSlot = useCallback(
    (parent: FlexSelectItem, slot: DropdownSlot) => {
      let next: Record<string, number> = { ...selection };
      if (slot.optionId) delete next[slot.optionId];
      delete next[parent.id];
      onSelectionChange(next);

      if (wearEnabled && onWearChange && slot.optionId) {
        onWearChange(
          pruneWearByOptionId(wearByOptionId, next, [slot.optionId]),
        );
        if (openWearOptionId === slot.optionId) setOpenWearOptionId(null);
      }

      if (slot.isHead) {
        setSlotsByParent((prev) => ({
          ...prev,
          [parent.id]: (prev[parent.id] ?? []).map((s) =>
            s.id === slot.id ? { ...s, optionId: null } : s,
          ),
        }));
      } else {
        setSlotsByParent((prev) => ({
          ...prev,
          [parent.id]: (prev[parent.id] ?? []).filter((s) => s.id !== slot.id),
        }));
      }
      setOpenSlotId(null);
    },
    [
      onSelectionChange,
      onWearChange,
      openWearOptionId,
      selection,
      wearByOptionId,
      wearEnabled,
    ],
  );

  const addCloneSlot = useCallback((parent: FlexSelectItem) => {
    const slotId = newCloneSlotId(parent.id);
    setSlotsByParent((prev) => {
      const slots = prev[parent.id] ?? [
        { id: headSlotId(parent.id), optionId: null, isHead: true },
      ];
      return {
        ...prev,
        [parent.id]: [...slots, { id: slotId, optionId: null, isHead: false }],
      };
    });
    setOpenSlotId(slotId);
  }, []);

  return (
    <>
    <section
      ref={viewRef}
      className={`select-view${
        tone === "session" ? " select-view--session" : ""
      }${SELECT_CHIPS_DENSE ? " select-view--dense" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-label={resolvedAriaLabel}
    >
      {displayItems.map((item) => {
        const itemText = displayLabel(item.label, uiLanguage);
        if (!flexSelectItemHasOptions(item)) {
          const ownedKey = selectionLineKey(item.id, "owned");
          const rentedKey = selectionLineKey(item.id, "rented");
          const ownedQty = flexSelectQty(selection, ownedKey);
          const rentedQty = acquisitionEnabled
            ? flexSelectQty(selection, rentedKey)
            : 0;
          const selectKey = selectionLineKey(item.id, acquisition);
          const primaryIsRented = rentedQty >= 1;
          const primaryKey = primaryIsRented ? rentedKey : ownedKey;
          const primaryQty = primaryIsRented ? rentedQty : ownedQty;
          const canRemoveCustom =
            onRemoveCustomItem != null && customItemIds?.has(item.id) === true;

          return (
            <Fragment key={item.id}>
              {/**
               * Stable `-slot` key: catalog chip becomes yellow rental in place
               * (no jump). Owned copy mounts after when a rental exists.
               */}
              <SimpleSelectChip
                key={`${item.id}-slot`}
                label={itemText}
                qty={primaryQty}
                rented={primaryIsRented}
                hasComment={
                  primaryIsRented
                    ? Boolean(commentsByLineKey?.[rentedKey]?.trim())
                    : false
                }
                onCommentClick={
                  primaryIsRented && commentsEnabled
                    ? () => openRentalComment(rentedKey, itemText)
                    : undefined
                }
                onRemove={
                  canRemoveCustom
                    ? () =>
                        setDeleteTarget({ id: item.id, label: itemText })
                    : undefined
                }
                onSelect={() =>
                  onSelectionChange(
                    ensureFlexSelectSelected(
                      selection,
                      primaryIsRented ? rentedKey : selectKey,
                    ),
                  )
                }
                onIncrement={() =>
                  onSelectionChange(
                    bumpFlexSelectQty(
                      ensureFlexSelectSelected(selection, primaryKey),
                      primaryKey,
                      1,
                    ),
                  )
                }
                onDecrement={() =>
                  onSelectionChange(
                    bumpFlexSelectQty(selection, primaryKey, -1),
                  )
                }
              />
              {primaryIsRented ? (
                <SimpleSelectChip
                  key={`${item.id}-owned-copy`}
                  label={itemText}
                  qty={ownedQty}
                  disabled={acquisition === "rented"}
                  onSelect={() =>
                    onSelectionChange(
                      ensureFlexSelectSelected(selection, ownedKey),
                    )
                  }
                  onIncrement={() =>
                    onSelectionChange(
                      bumpFlexSelectQty(
                        ensureFlexSelectSelected(selection, ownedKey),
                        ownedKey,
                        1,
                      ),
                    )
                  }
                  onDecrement={() =>
                    onSelectionChange(
                      bumpFlexSelectQty(selection, ownedKey, -1),
                    )
                  }
                />
              ) : null}
            </Fragment>
          );
        }

        const slots =
          slotsByParent[item.id] ??
          reconcileDropdownSlots(item, selection, undefined);
        const takenOptionIds = new Set(
          acquisition === "rented"
            ? optionIdsForItem(item).filter(
                (id) =>
                  flexSelectQty(selection, selectionLineKey(id, "rented")) >= 1,
              )
            : slots
                .map((slot) => slot.optionId)
                .filter((id): id is string => id != null),
        );
        const freeOptionCount = optionIdsForItem(item).filter(
          (id) => !takenOptionIds.has(id),
        ).length;
        const awaitingPick = slots.some((slot) => slot.optionId == null);
        const rentedOptionChips = acquisitionEnabled
          ? (item.children ?? []).flatMap((child) => {
              const rentedKey = selectionLineKey(child.id, "rented");
              const rentedQty = flexSelectQty(selection, rentedKey);
              if (rentedQty < 1) return [];
              const rentedLabel = `${itemText} · ${displayLabel(child.label, uiLanguage)}`;
              return [
                <SimpleSelectChip
                  key={rentedKey}
                  label={rentedLabel}
                  qty={rentedQty}
                  rented
                  hasComment={Boolean(commentsByLineKey?.[rentedKey]?.trim())}
                  onCommentClick={
                    commentsEnabled
                      ? () => openRentalComment(rentedKey, rentedLabel)
                      : undefined
                  }
                  onSelect={() =>
                    onSelectionChange(
                      ensureFlexSelectSelected(selection, rentedKey),
                    )
                  }
                  onIncrement={() =>
                    onSelectionChange(
                      bumpFlexSelectQty(
                        ensureFlexSelectSelected(selection, rentedKey),
                        rentedKey,
                        1,
                      ),
                    )
                  }
                  onDecrement={() =>
                    onSelectionChange(
                      bumpFlexSelectQty(selection, rentedKey, -1),
                    )
                  }
                />,
              ];
            })
          : [];

        return (
          <Fragment key={item.id}>
            {slots.map((slot, slotIndex) => {
              const selectedOption =
                slot.optionId != null
                  ? (item.children?.find((c) => c.id === slot.optionId) ?? null)
                  : null;
              const qty = selectedOption
                ? flexSelectQty(selection, selectedOption.id)
                : 0;
              const slotTaken = new Set(takenOptionIds);
              if (slot.optionId) slotTaken.delete(slot.optionId);
              const isLastInGroup = slotIndex === slots.length - 1;

              const handleOpenChange = (next: boolean) => {
                if (next) {
                  setOpenSlotId(slot.id);
                  setOpenWearOptionId(null);
                  return;
                }
                setOpenSlotId(null);
                // Empty clone dismissed (outside tap / Escape) → drop it.
                if (!slot.isHead && slot.optionId == null) {
                  setSlotsByParent((prev) => ({
                    ...prev,
                    [item.id]: (prev[item.id] ?? []).filter(
                      (s) => s.id !== slot.id,
                    ),
                  }));
                }
              };

              /** Reserve wear column for abrasive families before a variant is picked. */
              const reserveWear =
                wearEnabled && Boolean(item.requiresWear);
              const wearValue = selectedOption
                ? (wearByOptionId?.[selectedOption.id] ?? null)
                : null;

              const chip = (
                <SelectDropdownChip
                  item={item}
                  selectedOption={selectedOption}
                  qty={qty}
                  open={openSlotId === slot.id}
                  onOpenChange={handleOpenChange}
                  onPickOption={(optionId) =>
                    pickOptionForSlot(item, slot.id, slot.optionId, optionId)
                  }
                  onUnselect={() => unselectSlot(item, slot)}
                  onIncrement={() => {
                    if (!selectedOption) return;
                    onSelectionChange(
                      bumpFlexSelectQty(selection, selectedOption.id, 1),
                    );
                  }}
                  onDecrement={() => {
                    if (!selectedOption) return;
                    const nextQty =
                      flexSelectQty(selection, selectedOption.id) - 1;
                    if (nextQty < 1) {
                      unselectSlot(item, slot);
                      return;
                    }
                    onSelectionChange(
                      bumpFlexSelectQty(selection, selectedOption.id, -1),
                    );
                  }}
                  unselectLabel={resolvedUnselectLabel}
                  takenOptionIds={slotTaken}
                />
              );

              const wearControl = reserveWear ? (
                <WearSelectControl
                  value={wearValue}
                  disabled={selectedOption == null}
                  open={
                    selectedOption != null &&
                    openWearOptionId === selectedOption.id
                  }
                  onOpenChange={(next) => {
                    if (!selectedOption) return;
                    if (next) {
                      setOpenSlotId(null);
                      setOpenWearOptionId(selectedOption.id);
                      return;
                    }
                    setOpenWearOptionId(null);
                  }}
                  onPick={(level) => {
                    if (!onWearChange || !selectedOption) return;
                    onWearChange(
                      setWearForOption(
                        wearByOptionId,
                        selectedOption.id,
                        level,
                      ),
                    );
                  }}
                />
              ) : null;

              if (!isLastInGroup && !reserveWear) {
                return <Fragment key={slot.id}>{chip}</Fragment>;
              }

              const showCloneOnSlot =
                isLastInGroup && rentedOptionChips.length === 0;

              /** Wear and/or + fused to the chip — separate hit targets. */
              return (
                <div
                  key={slot.id}
                  className="select-chip-cluster"
                  data-selected={selectedOption ? "" : undefined}
                  data-has-wear={reserveWear ? "" : undefined}
                >
                  {chip}
                  {wearControl}
                  {showCloneOnSlot ? (
                    <DropdownClonePlusButton
                      familyLabel={itemText}
                      disabled={
                        acquisition === "rented" ||
                        freeOptionCount < 1 ||
                        awaitingPick
                      }
                      onClick={() => addCloneSlot(item)}
                    />
                  ) : null}
                </div>
              );
            })}
            {rentedOptionChips}
            {rentedOptionChips.length > 0 ? (
              <DropdownClonePlusButton
                familyLabel={itemText}
                disabled={
                  acquisition === "rented" ||
                  freeOptionCount < 1 ||
                  awaitingPick
                }
                onClick={() => addCloneSlot(item)}
              />
            ) : null}
          </Fragment>
        );
      })}
      {onAddSimpleItem ? (
        <AddSimpleItemControl
          label={resolvedAddSimpleLabel}
          placeholder={resolvedAddSimplePlaceholder}
          onAdd={(name) => {
            setOpenSlotId(null);
            onAddSimpleItem(name, acquisition);
          }}
        />
      ) : null}
      {acquisitionEnabled ? (
        <RentedArmControl armed={rentalArmed} onArmedChange={setRentalArmed} />
      ) : null}
    </section>
      {commentsEnabled ? (
        <ToolRentalCommentSheet
          open={commentTarget != null}
          onOpenChange={(next) => {
            if (!next) setCommentTarget(null);
          }}
          toolLabel={commentTarget?.label ?? ""}
          initialComment={
            commentTarget
              ? (commentsByLineKey?.[commentTarget.lineKey] ?? "")
              : ""
          }
          onSave={(comment) => {
            if (!commentTarget || !onRentalCommentChange) return;
            onRentalCommentChange(commentTarget.lineKey, comment);
          }}
        />
      ) : null}
      {onRemoveCustomItem ? (
        <ConfirmDeleteSheet
          open={deleteTarget != null}
          onOpenChange={(next) => {
            if (!next) setDeleteTarget(null);
          }}
          itemLabel={deleteTarget?.label ?? ""}
          onConfirm={() => {
            if (!deleteTarget) return;
            onRemoveCustomItem(deleteTarget.id);
          }}
        />
      ) : null}
    </>
  );
}
