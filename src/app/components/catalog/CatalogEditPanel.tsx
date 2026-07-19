import { useMemo, useState } from "react";
import {
  flattenCatalogForEdit,
  type CatalogEditRow,
} from "../../domain/select/catalogMutations";
import type { FlexSelectItem } from "../../domain/select/types";
import { cv } from "../../ui/tokens";
import { PageSearchField } from "../shared/PageSearchField";
import { SHEET_LIST_ROW_CLASS } from "../sheets/sheetChrome";

/** Edit global catalog — fixed chrome + independently scrolling list. */
export function CatalogEditPanel({
  items,
  onAdd,
  onRename,
  onRemove,
  searchPlaceholder = "Search items…",
}: {
  items: readonly FlexSelectItem[];
  onAdd: (label: string) => void;
  onRename: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const rows = useMemo(() => flattenCatalogForEdit(items), [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.label.toLowerCase().includes(q) ||
        (row.parentLabel?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, query]);

  const startEdit = (row: CatalogEditRow) => {
    setEditingId(row.id);
    setEditDraft(row.label);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const next = editDraft.trim();
    if (next) onRename(editingId, next);
    setEditingId(null);
    setEditDraft("");
  };

  return (
    <div className="catalog-hub__edit">
      <div className="catalog-hub__edit-fixed">
        <p className="catalog-hub__lede">
          Manage the global list used in sessions and Report. Groups keep their
          dropdown options.
        </p>

        <form
          className="catalog-hub__add-row"
          onSubmit={(e) => {
            e.preventDefault();
            const label = draft.trim();
            if (!label) return;
            onAdd(label);
            setDraft("");
          }}
        >
          <input
            type="text"
            className="catalog-hub__add-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New simple item name"
            maxLength={48}
          />
          <button
            type="submit"
            className="destination-page__primary-btn catalog-hub__add-btn"
          >
            Add
          </button>
        </form>

        <PageSearchField
          className="catalog-hub__search"
          placeholder={searchPlaceholder}
          value={query}
          onChange={setQuery}
        />
      </div>

      <div className="catalog-hub__edit-scroll">
        {filtered.length === 0 ? (
          <p
            className="destination-page__empty"
            style={{ color: cv.text.dimmed }}
          >
            {rows.length === 0
              ? "No items yet."
              : `No items match “${query.trim()}”.`}
          </p>
        ) : (
          <ul className="catalog-hub__edit-list">
            {filtered.map((row) => {
              const editing = editingId === row.id;
              return (
                <li key={row.id}>
                  <article
                    className={`${SHEET_LIST_ROW_CLASS} catalog-hub__edit-card rounded-2xl`}
                  >
                    <div className="catalog-hub__edit-card-main">
                      {editing ? (
                        <input
                          className="catalog-hub__rename-input"
                          value={editDraft}
                          autoFocus
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEdit();
                            }
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setEditDraft("");
                            }
                          }}
                          onBlur={commitEdit}
                        />
                      ) : (
                        <>
                          <span className="catalog-hub__edit-card-title">
                            {row.label}
                          </span>
                          <span className="catalog-hub__edit-card-meta">
                            {row.isGroup
                              ? `Group · ${row.optionCount} options`
                              : row.parentLabel
                                ? `Option · ${row.parentLabel}`
                                : "Simple item"}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="catalog-hub__edit-actions">
                      {!editing ? (
                        <button
                          type="button"
                          className="catalog-hub__text-btn"
                          onClick={() => startEdit(row)}
                        >
                          Edit
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="catalog-hub__delete-btn"
                        aria-label={`Delete ${row.label}`}
                        onClick={() => {
                          const ok = window.confirm(
                            row.isGroup
                              ? `Remove “${row.label}” and its options?`
                              : `Remove “${row.label}”?`,
                          );
                          if (ok) onRemove(row.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
