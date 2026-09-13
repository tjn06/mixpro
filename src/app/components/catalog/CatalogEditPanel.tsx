import { useMemo, useState, type FocusEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  catalogRowMatchesQuery,
  flattenCatalogForEdit,
  type CatalogEditRow,
} from "../../domain/select/catalogMutations";
import type { FlexSelectItem } from "../../domain/select/types";
import {
  bilingualFromFields,
  isLocalizedLabel,
  type ItemLabel,
  type LocalizedLabel,
} from "../../i18n/localizedLabel";
import { useSettingsStore } from "../../settings/store";
import { cv } from "../../ui/tokens";
import { PageSearchField } from "../shared/PageSearchField";
import { CatalogAddItemSheet } from "../sheets/CatalogAddItemSheet";
import { SHEET_LIST_ROW_CLASS } from "../sheets/sheetChrome";

/** Edit global catalog — fixed chrome + independently scrolling list. */
export function CatalogEditPanel({
  items,
  onAddBilingual,
  onRename,
  onRemove,
  searchPlaceholder,
}: {
  items: readonly FlexSelectItem[];
  onAddBilingual: (label: LocalizedLabel) => void;
  onRename: (id: string, label: ItemLabel) => void;
  onRemove: (id: string) => void;
  searchPlaceholder?: string;
}) {
  const { t } = useTranslation("common");
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const resolvedSearch = searchPlaceholder ?? t("catalog.edit.search");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBilingual, setEditingBilingual] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [editDraftEn, setEditDraftEn] = useState("");
  const [editDraftSv, setEditDraftSv] = useState("");

  const rows = useMemo(
    () => flattenCatalogForEdit(items, uiLanguage),
    [items, uiLanguage],
  );
  const filtered = useMemo(
    () => rows.filter((row) => catalogRowMatchesQuery(row, query)),
    [rows, query],
  );

  const clearEdit = () => {
    setEditingId(null);
    setEditingBilingual(false);
    setEditDraft("");
    setEditDraftEn("");
    setEditDraftSv("");
  };

  const startEdit = (row: CatalogEditRow) => {
    setEditingId(row.id);
    if (row.bilingual && isLocalizedLabel(row.rawLabel)) {
      setEditingBilingual(true);
      setEditDraftEn(row.rawLabel.en);
      setEditDraftSv(row.rawLabel.sv);
      setEditDraft("");
      return;
    }
    setEditingBilingual(false);
    setEditDraft(typeof row.rawLabel === "string" ? row.rawLabel : row.label);
    setEditDraftEn("");
    setEditDraftSv("");
  };

  const commitEdit = () => {
    if (!editingId) return;
    if (editingBilingual) {
      const next = bilingualFromFields(editDraftEn, editDraftSv);
      if (next) onRename(editingId, next);
    } else {
      const next = editDraft.trim();
      if (next) onRename(editingId, next);
    }
    clearEdit();
  };

  const onBilingualRenameBlur = (e: FocusEvent<HTMLInputElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.parentElement?.contains(next)) return;
    commitEdit();
  };

  return (
    <div className="catalog-hub__edit">
      <div className="catalog-hub__edit-fixed">
        <p className="catalog-hub__lede">{t("catalog.edit.lede")}</p>

        <button
          type="button"
          className="destination-page__primary-btn destination-page__primary-btn--form catalog-hub__add-btn"
          onClick={() => setAddOpen(true)}
        >
          {t("catalog.edit.add")}
        </button>

        <PageSearchField
          className="catalog-hub__search"
          placeholder={resolvedSearch}
          value={query}
          onChange={setQuery}
        />
      </div>

      <CatalogAddItemSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onConfirm={onAddBilingual}
      />

      <div className="catalog-hub__edit-scroll">
        {filtered.length === 0 ? (
          <p
            className="destination-page__empty"
            style={{ color: cv.text.dimmed }}
          >
            {rows.length === 0
              ? t("catalog.edit.empty")
              : t("catalog.edit.noMatch", { query: query.trim() })}
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
                        editingBilingual ? (
                          <div className="catalog-hub__rename-stack">
                            <input
                              className="catalog-hub__rename-input"
                              value={editDraftEn}
                              autoFocus
                              aria-label={t("catalog.edit.nameEn")}
                              placeholder={t("catalog.edit.placeholderEn")}
                              onChange={(e) => setEditDraftEn(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitEdit();
                                }
                                if (e.key === "Escape") {
                                  clearEdit();
                                }
                              }}
                              onBlur={onBilingualRenameBlur}
                            />
                            <input
                              className="catalog-hub__rename-input"
                              value={editDraftSv}
                              aria-label={t("catalog.edit.nameSv")}
                              placeholder={t("catalog.edit.placeholderSv")}
                              onChange={(e) => setEditDraftSv(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitEdit();
                                }
                                if (e.key === "Escape") {
                                  clearEdit();
                                }
                              }}
                              onBlur={onBilingualRenameBlur}
                            />
                          </div>
                        ) : (
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
                                clearEdit();
                              }
                            }}
                            onBlur={commitEdit}
                          />
                        )
                      ) : (
                        <>
                          <span className="catalog-hub__edit-card-title">
                            {row.label}
                          </span>
                          <span className="catalog-hub__edit-card-meta">
                            {row.isGroup
                              ? t("catalog.edit.groupMeta", {
                                  count: row.optionCount,
                                })
                              : row.parentLabel
                                ? t("catalog.edit.optionMeta", {
                                    parent: row.parentLabel,
                                  })
                                : t("catalog.edit.simpleItem")}
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
                          {t("common.edit")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="catalog-hub__delete-btn"
                        aria-label={t("catalog.edit.deleteAria", {
                          name: row.label,
                        })}
                        onClick={() => {
                          const ok = window.confirm(
                            row.isGroup
                              ? t("catalog.edit.confirmRemoveGroup", {
                                  name: row.label,
                                })
                              : t("catalog.edit.confirmRemove", {
                                  name: row.label,
                                }),
                          );
                          if (ok) onRemove(row.id);
                        }}
                      >
                        {t("common.delete")}
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
