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
  flexSelectItemHasOptions,
  optionIdsForItem,
  type FlexSelectItem,
} from "../../domain/select/types";
import {
  WEAR_LEVEL_A11Y_LABELS,
  WEAR_LEVELS,
  WEAR_LEVEL_LABELS,
  WEAR_PLACEHOLDER_LABEL,
  pruneWearByOptionId,
  setWearForOption,
  type WearByOptionId,
  type WearLevel,
} from "../../domain/select/wear";
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
  familyLabel: string,
  options: readonly FlexSelectItem[] | undefined,
): string {
  let widest = familyLabel;
  for (const option of options ?? []) {
    if (option.label.length > widest.length) widest = option.label;
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
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const deferOpenRef = useRef<number | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const listboxId = useId();
  const selected = selectedOption != null;
  const widthSizerLabel = useMemo(
    () => widestOptionLabel(item.label, item.children),
    [item.label, item.children],
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
            aria-label={item.label}
          >
            {item.children?.map((option) => {
              const active = selectedOption?.id === option.id;
              const taken = !active && takenOptionIds.has(option.id);
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
                  {option.label}
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

  const ariaLabel = selectedOption
    ? qty > 1
      ? `${item.label}, ${selectedOption.label}, quantity ${qty}`
      : `${item.label}, ${selectedOption.label}`
    : item.label;

  return (
    <div className="select-chip-anchor" ref={anchorRef}>
      <button
        type="button"
        className="select-chip select-chip--select"
        data-selected={selected ? "" : undefined}
        data-family={selectedOption ? item.label : undefined}
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
            {selectedOption?.label ?? item.label}
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

function SimpleSelectChip({
  label,
  qty,
  onSelect,
  onIncrement,
  onDecrement,
}: {
  label: string;
  qty: number;
  onSelect: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const selected = qty >= 1;
  const gestures = useSelectChipGestures({
    mode: selected ? "qty" : "select",
    onTap: () => {
      if (!selected) onSelect();
    },
    onDoubleTap: onIncrement,
    onLongPress: onDecrement,
  });

  return (
    <button
      type="button"
      className="select-chip"
      data-selected={selected ? "" : undefined}
      data-qty={qty > 1 ? String(qty) : undefined}
      aria-pressed={selected}
      aria-label={
        selected ? (qty > 1 ? `${label}, quantity ${qty}` : label) : label
      }
      {...gestures}
    >
      <span className="select-chip__label">{label}</span>
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
        Add
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
  return (
    <button
      type="button"
      className="select-chip select-chip--clone-plus"
      disabled={disabled}
      aria-label={`Add another ${familyLabel}`}
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

  const menu =
    open && !disabled && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            className="select-chip-menu select-chip-menu--wear"
            style={menuStyle}
            role="listbox"
            aria-label="Slitage"
          >
            {WEAR_LEVELS.map((level) => {
              const active = value === level;
              return (
                <button
                  key={level}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={WEAR_LEVEL_A11Y_LABELS[level]}
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
        data-wear-title={disabled ? undefined : "Slitage"}
        data-selected={value ? "" : undefined}
        data-open={open ? "" : undefined}
        data-reserved={!value && !disabled ? "" : undefined}
        disabled={disabled}
        aria-label={
          value
            ? `Slitage ${WEAR_LEVEL_A11Y_LABELS[value]}`
            : "Välj slitage"
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
  unselectLabel = "Unselect",
  addSimpleLabel = "Custom",
  addSimplePlaceholder = "Custom item name",
  onAddSimpleItem,
  "aria-label": ariaLabel = "Select items",
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
  onAddSimpleItem?: (label: string) => void;
  addSimpleLabel?: string;
  addSimplePlaceholder?: string;
  "aria-label"?: string;
}) {
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [openWearOptionId, setOpenWearOptionId] = useState<string | null>(null);
  const wearEnabled = onWearChange != null;
  /** Linked clone chips live here — never added to catalog `items` / sort. */
  const [slotsByParent, setSlotsByParent] = useState<
    Record<string, DropdownSlot[]>
  >({});

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
    <section
      className={`select-view${
        tone === "session" ? " select-view--session" : ""
      }${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        if (!flexSelectItemHasOptions(item)) {
          const qty = flexSelectQty(selection, item.id);
          return (
            <SimpleSelectChip
              key={item.id}
              label={item.label}
              qty={qty}
              onSelect={() =>
                onSelectionChange(ensureFlexSelectSelected(selection, item.id))
              }
              onIncrement={() =>
                onSelectionChange(
                  bumpFlexSelectQty(
                    ensureFlexSelectSelected(selection, item.id),
                    item.id,
                    1,
                  ),
                )
              }
              onDecrement={() =>
                onSelectionChange(bumpFlexSelectQty(selection, item.id, -1))
              }
            />
          );
        }

        const slots =
          slotsByParent[item.id] ??
          reconcileDropdownSlots(item, selection, undefined);
        const takenOptionIds = new Set(
          slots
            .map((slot) => slot.optionId)
            .filter((id): id is string => id != null),
        );
        const freeOptionCount = optionIdsForItem(item).filter(
          (id) => !takenOptionIds.has(id),
        ).length;
        const awaitingPick = slots.some((slot) => slot.optionId == null);

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
                  unselectLabel={unselectLabel}
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
                  {isLastInGroup ? (
                    <DropdownClonePlusButton
                      familyLabel={item.label}
                      disabled={freeOptionCount < 1 || awaitingPick}
                      onClick={() => addCloneSlot(item)}
                    />
                  ) : null}
                </div>
              );
            })}
          </Fragment>
        );
      })}
      {onAddSimpleItem ? (
        <AddSimpleItemControl
          label={addSimpleLabel}
          placeholder={addSimplePlaceholder}
          onAdd={(name) => {
            setOpenSlotId(null);
            onAddSimpleItem(name);
          }}
        />
      ) : null}
    </section>
  );
}
