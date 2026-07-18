import { ChevronDown, Plus } from "lucide-react";
import {
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
  bumpFlexSelectQty,
  ensureFlexSelectSelected,
  flexSelectQty,
  setFlexSelectQty,
  type FlexSelectSelection,
} from "../../domain/select/selection";
import {
  findSelectedOptionQty,
  flexSelectItemHasOptions,
  optionIdsForItem,
  type FlexSelectItem,
} from "../../domain/select/types";
import { useSelectChipGestures } from "./useSelectChipGestures";

const CHEVRON_SIZE = 14;
const PLUS_SIZE = 14;
const MENU_GAP_PX = 4;
const DEFER_MENU_MS = 340;

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
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const deferOpenRef = useRef<number | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const listboxId = useId();
  const selected = selectedOption != null;

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
    const minWidth = Math.max(rect.width, 148);
    let left = rect.left;
    if (left + minWidth > window.innerWidth - viewportPad) {
      left = Math.max(viewportPad, window.innerWidth - viewportPad - minWidth);
    }
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + MENU_GAP_PX,
      left,
      minWidth,
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
      }, DEFER_MENU_MS);
    },
    onDoubleTap: () => {
      clearDeferOpen();
      if (selected) onIncrement();
    },
    onLongPress: () => {
      clearDeferOpen();
      if (selected) onDecrement();
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
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className="select-chip-menu__option"
                  data-active={active ? "" : undefined}
                  onClick={() => onPickOption(option.id)}
                >
                  {option.label}
                  {active && qty > 0 ? (
                    <span className="select-chip-menu__option-qty">{qty}</span>
                  ) : null}
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

  return (
    <div className="select-chip-anchor" ref={anchorRef}>
      <button
        type="button"
        className="select-chip select-chip--select"
        data-selected={selected ? "" : undefined}
        data-qty={qty >= 1 ? String(qty) : undefined}
        data-open={open ? "" : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        {...gestures}
      >
        <span className="select-chip__group-label">{item.label}</span>
        {selectedOption ? (
          <span className="select-chip__choice">{selectedOption.label}</span>
        ) : null}
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
    onTap: () => {
      if (!selected) onSelect();
    },
    onDoubleTap: () => {
      onIncrement();
    },
    onLongPress: () => {
      if (selected) onDecrement();
    },
  });

  return (
    <button
      type="button"
      className="select-chip"
      data-selected={selected ? "" : undefined}
      data-qty={qty >= 1 ? String(qty) : undefined}
      aria-pressed={selected}
      aria-label={selected ? `${label}, quantity ${qty}` : label}
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

export function FlexSelectView({
  items,
  selection,
  onSelectionChange,
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
  const [openId, setOpenId] = useState<string | null>(null);

  const pickOption = useCallback(
    (parent: FlexSelectItem, optionId: string) => {
      const groupIds = optionIdsForItem(parent);
      const groupQty = Math.max(
        0,
        ...groupIds.map((id) => flexSelectQty(selection, id)),
      );
      let next: Record<string, number> = { ...selection };
      for (const id of groupIds) delete next[id];
      delete next[parent.id];
      next = setFlexSelectQty(next, optionId, groupQty >= 1 ? groupQty : 1);
      onSelectionChange(next);
      setOpenId(null);
    },
    [onSelectionChange, selection],
  );

  const unselectGroup = useCallback(
    (parent: FlexSelectItem) => {
      const groupIds = new Set(optionIdsForItem(parent));
      const next = { ...selection };
      for (const id of groupIds) delete next[id];
      delete next[parent.id];
      onSelectionChange(next);
      setOpenId(null);
    },
    [onSelectionChange, selection],
  );

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

        const picked = findSelectedOptionQty(item, selection);
        return (
          <SelectDropdownChip
            key={item.id}
            item={item}
            selectedOption={picked?.option ?? null}
            qty={picked?.qty ?? 0}
            open={openId === item.id}
            onOpenChange={(next) => setOpenId(next ? item.id : null)}
            onPickOption={(optionId) => pickOption(item, optionId)}
            onUnselect={() => unselectGroup(item)}
            onIncrement={() => {
              if (!picked) return;
              onSelectionChange(
                bumpFlexSelectQty(selection, picked.option.id, 1),
              );
            }}
            onDecrement={() => {
              if (!picked) return;
              onSelectionChange(
                bumpFlexSelectQty(selection, picked.option.id, -1),
              );
            }}
            unselectLabel={unselectLabel}
          />
        );
      })}
      {onAddSimpleItem ? (
        <AddSimpleItemControl
          label={addSimpleLabel}
          placeholder={addSimplePlaceholder}
          onAdd={(name) => {
            setOpenId(null);
            onAddSimpleItem(name);
          }}
        />
      ) : null}
    </section>
  );
}
