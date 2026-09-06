import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { formatMixAmount, MIX_PARAMS } from "../../domain/mix/entities";
import { getEntityMetaLabel, recipeIngredientIndexes } from "../../domain/recipe/calc";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { gramsFromSlotValues } from "../../saved-batch-totals/batches";
import type { SessionBatchItem } from "../../sessions/types";
import {
  CARD_NAME_WEIGHT,
  entityValueColor,
} from "../../presentation/entityCardStyles";
import { entityAccentColor } from "../../presentation/entityAccent";
import {
  CloseIcon,
  DeleteIcon,
  MessageIcon,
  ModifyIcon,
  RenameIcon,
  SaveIcon,
} from "../shared/ActionIcons";
import { LongPressButton } from "../shared/LongPressButton";
import type { ColorScheme } from "../../../theme/appearance";
import { cv } from "../../ui/tokens";
import { sessionBatchTotalGrams } from "../../domain/sessions/totals";

const bt = cv.batchTotals;
const HEADER_ICON_SIZE = 14;
/** Treat as "updated" only if meaningfully after create (not same write). */
const UPDATED_SLACK_MS = 1500;

const REMOVE_LONG_PRESS_STYLE: CSSProperties = {
  width: 28,
  height: 28,
  minHeight: 0,
  borderRadius: 9999,
  padding: 0,
  background:
    "color-mix(in srgb, var(--semantic-text-primary) 8%, transparent)",
  border: "1px solid var(--semantic-border-default)",
  color: "var(--semantic-text-muted)",
};

function formatActivityWhen(iso: string): string | null {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return format(new Date(ms), "d MMM yyyy · HH:mm");
}

function batchActivityStamp(batch: SessionBatchItem): {
  created: string | null;
  updated: string | null;
} {
  const created = formatActivityWhen(batch.createdAt);
  const createdMs = new Date(batch.createdAt).getTime();
  const updatedMs = new Date(batch.updatedAt).getTime();
  const showUpdated =
    Number.isFinite(createdMs) &&
    Number.isFinite(updatedMs) &&
    updatedMs > createdMs + UPDATED_SLACK_MS;
  return {
    created,
    updated: showUpdated ? formatActivityWhen(batch.updatedAt) : null,
  };
}

const TABLE_TEXT: CSSProperties = {
  fontSize: "var(--text-totals-table)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  lineHeight: 1.35,
};

const TH_TEXT: CSSProperties = {
  ...TABLE_TEXT,
  letterSpacing: "0.08em",
  fontWeight: 600,
  color: cv.text.muted,
  textTransform: "uppercase",
  lineHeight: 1.15,
};

const MULT_TEXT: CSSProperties = {
  ...TABLE_TEXT,
  fontSize: "var(--text-totals-mult)",
  fontWeight: 600,
  color: cv.text.secondary,
  letterSpacing: "0.02em",
};

const COL_ITEM = "46%";
const COL_MULT = "14%";
const COL_TOTAL = "40%";
const TABLE_COLS = `${COL_ITEM} ${COL_MULT} ${COL_TOTAL}`;

function cardRoundBtnStyle(disabled?: boolean, color?: string): CSSProperties {
  return {
    width: "var(--totals-header-icon-btn)",
    height: "var(--totals-header-icon-btn)",
    minHeight: 0,
    borderRadius: "calc(var(--totals-header-icon-btn) / 2)",
    background: bt.cardHeaderBtnBackground,
    border: bt.cardHeaderBtnBorder,
    color: disabled ? cv.text.muted : color ?? cv.text.muted,
    opacity: disabled ? 0.35 : 1,
    cursor: disabled ? "default" : "pointer",
    padding: 0,
  };
}

function StepButton({
  label,
  onClick,
  disabled,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const symbol = label === "Decrease batch count" ? "−" : "+";
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`batch-totals-card-header-btn flex items-center justify-center shrink-0 transition-colors duration-150 active:scale-95${
        compact ? " session-mix-card__step-btn" : ""
      }`}
      style={
        compact
          ? undefined
          : {
              ...cardRoundBtnStyle(disabled),
              fontSize: "var(--totals-step-font-size)",
              fontWeight: 300,
              lineHeight: 1,
            }
      }
    >
      {symbol}
    </button>
  );
}

function IconHeaderButton({
  label,
  onClick,
  onPointerDown,
  color = cv.text.muted,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  onPointerDown?: (e: PointerEvent<HTMLButtonElement>) => void;
  color?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      className="session-mix-card__action-btn flex items-center justify-center shrink-0 transition-colors duration-150 active:scale-95"
      style={{ color }}
    >
      {children}
    </button>
  );
}

function AmountCell({
  grams,
  isKg,
  colorScheme,
}: {
  grams: number;
  isKg: boolean;
  colorScheme: ColorScheme;
}) {
  const unit = isKg ? "kg" : "g";
  return (
    <span
      className="app-readout tabular-nums whitespace-nowrap"
      style={{ color: entityValueColor(true, colorScheme) }}
    >
      {formatMixAmount(grams, isKg)}
      <span
        style={{
          color: cv.text.muted,
          fontWeight: 500,
          marginLeft: 3,
          fontSize: "var(--text-totals-unit)",
        }}
      >
        {unit}
      </span>
    </span>
  );
}

export function SessionMixCard({
  batch,
  recipe,
  colorScheme,
  expanded,
  onExpandedChange,
  onMultiplierChange,
  onCommentChange,
  onEdit,
  onRemove,
  readOnly = false,
}: {
  batch: SessionBatchItem;
  recipe: BlendingRecipe | null;
  colorScheme: ColorScheme;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  onMultiplierChange: (next: number) => void;
  onCommentChange: (next: string) => void;
  onEdit: () => void;
  onRemove: () => void;
  /** When true, day-scoped edits (mult, comment, edit, remove) are blocked. */
  readOnly?: boolean;
}) {
  const values = gramsFromSlotValues(batch.values);
  const mult = Math.max(1, batch.multiplier);
  const totalGrams = sessionBatchTotalGrams(batch);
  const amountColor = entityValueColor(true, colorScheme);
  const totalParam = MIX_PARAMS[0];
  const ingredientIndexes = recipe
    ? recipeIngredientIndexes(recipe)
    : [0, 1, 2, 3, 4].filter((i) => (values[i] ?? 0) > 0 || i === 0);
  const batchRowIndexes = [
    ...ingredientIndexes.filter((i) => i !== 0),
    0,
  ];
  const activityStamp = batchActivityStamp(batch);
  const savedComment = batch.comment?.trim() ?? "";
  const hasComment = savedComment.length > 0;

  const [commentOpen, setCommentOpen] = useState(false);
  const [commentEditing, setCommentEditing] = useState(false);
  const [draftComment, setDraftComment] = useState(savedComment);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!expanded) {
      setCommentOpen(false);
      setCommentEditing(false);
    }
  }, [expanded]);

  useEffect(() => {
    if (!readOnly) return;
    setCommentEditing(false);
    setDraftComment(savedComment);
  }, [readOnly, savedComment]);

  useEffect(() => {
    if (!commentEditing) setDraftComment(savedComment);
  }, [savedComment, commentEditing]);

  useEffect(() => {
    if (!commentOpen || !commentEditing || readOnly) return;
    const el = commentInputRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [commentOpen, commentEditing, readOnly]);

  const discardCommentDraft = () => {
    setDraftComment(savedComment);
    setCommentEditing(false);
  };

  const saveComment = () => {
    if (readOnly || !commentEditing) return;
    const next = draftComment.trim();
    if (next !== savedComment) onCommentChange(next);
    setDraftComment(next);
    setCommentEditing(false);
  };

  const openCommentPanel = () => {
    if (commentOpen) {
      discardCommentDraft();
      setCommentOpen(false);
      return;
    }
    setDraftComment(savedComment);
    setCommentOpen(true);
    setCommentEditing(false);
  };

  const onEditComment = () => {
    if (readOnly) return;
    if (commentEditing) {
      discardCommentDraft();
      return;
    }
    setDraftComment(savedComment);
    setCommentEditing(true);
  };

  return (
    <div className="batch-totals-source-card session-mix-card w-full min-w-0 shrink-0 overflow-hidden">
      <div
        className="shrink-0 grid items-center min-w-0 w-full session-mix-card__header session-mix-card__header--collapsed"
        style={{
          padding:
            "var(--totals-card-header-py) var(--batch-totals-content-gutter, var(--totals-card-header-px))",
          background: bt.cardHeaderBackground,
          minHeight: "var(--totals-card-header-min-h, var(--totals-header-icon-btn))",
        }}
      >
        <button
          type="button"
          className="session-mix-card__title-btn min-w-0 text-left"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
        >
          <p className="truncate session-mix-card__title">{batch.name}</p>
          <span className="session-mix-card__amount-row">
            <ChevronDown
              className={`session-mix-card__chevron${
                expanded ? " session-mix-card__chevron--open" : ""
              }`}
              size={16}
              strokeWidth={2}
              aria-hidden
            />
            <span className="session-mix-card__amount app-readout tabular-nums">
              <AmountCell
                grams={totalGrams}
                isKg={totalParam.isKg}
                colorScheme={colorScheme}
              />
            </span>
          </span>
        </button>

        <div
          className="session-mix-card__mult-field"
          aria-label={`Batch multiplier, ${mult}`}
        >
          <StepButton
            label="Decrease batch count"
            onClick={() => onMultiplierChange(Math.max(1, mult - 1))}
            disabled={readOnly || mult <= 1}
            compact
          />
          <span className="tabular-nums session-mix-card__mult-value session-mix-card__mult-value--field">
            <span className="session-mix-card__mult-mark" aria-hidden>
              ×
            </span>
            {mult}
          </span>
          <StepButton
            label="Increase batch count"
            onClick={() => onMultiplierChange(Math.min(999, mult + 1))}
            disabled={readOnly || mult >= 999}
            compact
          />
        </div>
      </div>

      {expanded ? (
        <div
          className="session-mix-card__subheader"
          style={{ background: bt.cardHeaderBackground }}
        >
          <div className="session-mix-card__stamp" aria-label="Mix activity">
            {activityStamp.created ? (
              <span className="session-mix-card__stamp-line">
                Created {activityStamp.created}
              </span>
            ) : null}
            {activityStamp.updated ? (
              <span className="session-mix-card__stamp-line">
                Updated {activityStamp.updated}
              </span>
            ) : null}
          </div>
          <div className="session-mix-card__actions">
            <div
              className={`session-mix-card__action-group${
                commentOpen ? " session-mix-card__action-group--open" : ""
              }`}
              role="group"
              aria-label="Mix comment"
            >
              <IconHeaderButton
                label={
                  commentOpen
                    ? `Close comment on ${batch.name}`
                    : hasComment
                      ? `Comment on ${batch.name}`
                      : `Add comment to ${batch.name}`
                }
                onClick={openCommentPanel}
                color={commentOpen ? cv.text.primary : cv.text.muted}
              >
                {commentOpen ? (
                  <CloseIcon size={HEADER_ICON_SIZE} />
                ) : (
                  <MessageIcon size={HEADER_ICON_SIZE} />
                )}
              </IconHeaderButton>
              <span
                className={`session-mix-card__action-reveal${
                  commentOpen ? " session-mix-card__action-reveal--open" : ""
                }`}
                aria-hidden={!commentOpen}
              >
                <span className="session-mix-card__action-reveal-inner">
                  <span className="session-mix-card__action-group-label">
                    Comment
                  </span>
                  <IconHeaderButton
                    label={
                      commentEditing
                        ? `Cancel editing comment on ${batch.name}`
                        : `Edit comment on ${batch.name}`
                    }
                    onClick={onEditComment}
                    disabled={readOnly}
                    color={commentEditing ? cv.text.primary : cv.text.muted}
                  >
                    <ModifyIcon size={HEADER_ICON_SIZE} />
                  </IconHeaderButton>
                  <IconHeaderButton
                    label={`Save comment on ${batch.name}`}
                    onClick={saveComment}
                    disabled={readOnly || !commentEditing}
                    onPointerDown={(e) => {
                      if (commentEditing) e.preventDefault();
                    }}
                  >
                    <SaveIcon size={HEADER_ICON_SIZE} />
                  </IconHeaderButton>
                </span>
              </span>
            </div>
            <IconHeaderButton
              label={`Edit ${batch.name}`}
              onClick={onEdit}
              disabled={readOnly}
            >
              <RenameIcon size={HEADER_ICON_SIZE} />
            </IconHeaderButton>
            <LongPressButton
              label={`Hold to remove ${batch.name}`}
              confirmAction="REMOVE MIX"
              onLongPress={onRemove}
              disabled={readOnly}
              progressVariant="beam"
              compact
              icon={<DeleteIcon size={HEADER_ICON_SIZE} />}
              className="session-mix-card__action-btn session-mix-card__remove-btn"
              style={REMOVE_LONG_PRESS_STYLE}
            />
          </div>
        </div>
      ) : null}

      {expanded && commentOpen ? (
        <div
          className="session-mix-card__comment"
          style={{ background: bt.cardHeaderBackground }}
        >
          {commentEditing ? (
            <textarea
              ref={commentInputRef}
              className="session-mix-card__comment-input"
              value={draftComment}
              onChange={(e) => setDraftComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  discardCommentDraft();
                }
              }}
              rows={1}
              placeholder="Add a note for this mix…"
              aria-label={`Comment on ${batch.name}`}
            />
          ) : (
            <p
              className={`session-mix-card__comment-text${
                hasComment ? "" : " session-mix-card__comment-text--empty"
              }`}
            >
              {hasComment ? savedComment : "No comment yet"}
            </p>
          )}
        </div>
      ) : null}

      {expanded ? (
        <div className="batch-totals-source-card__body">
          <table
            className="batch-totals-source-table w-full min-w-0 border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: COL_ITEM }} />
              <col style={{ width: COL_MULT }} />
              <col style={{ width: COL_TOTAL }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="text-left" style={{ ...TH_TEXT, padding: "var(--totals-th-py) var(--totals-th-px)" }}>
                  Item
                </th>
                <th scope="col" className="text-center" style={{ ...TH_TEXT, padding: "var(--totals-th-py) var(--totals-th-mult-px, 8px)" }}>
                  ×
                </th>
                <th scope="col" className="text-right" style={{ ...TH_TEXT, padding: "var(--totals-th-py) var(--totals-th-px)" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {batchRowIndexes.map((pi) => {
                const p = MIX_PARAMS[pi];
                const isTotal = pi === 0;
                const perBatch = values[pi] ?? 0;
                const lineTotal = perBatch * mult;
                const metaLabel =
                  !isTotal && recipe ? getEntityMetaLabel(recipe, p.id) : undefined;

                return (
                  <tr key={p.id} {...(isTotal ? { "data-total-row": true } : undefined)}>
                    <th
                      scope="row"
                      className="text-left align-middle font-normal"
                      style={{
                        paddingBlock: "var(--totals-cell-py)",
                        paddingInlineEnd: "var(--totals-cell-px)",
                        ...(isTotal
                          ? { paddingTop: "calc(var(--totals-cell-py) + 6px)" }
                          : null),
                      }}
                    >
                      <div className="min-w-0">
                        <div className="min-w-0 flex items-baseline gap-1">
                          <span
                            className="truncate shrink-0"
                            style={{
                              fontSize: "var(--text-card-name)",
                              letterSpacing: "0.18em",
                              fontWeight: CARD_NAME_WEIGHT,
                              color: entityAccentColor(p.id, colorScheme),
                              lineHeight: 1.15,
                            }}
                          >
                            {p.id}
                          </span>
                          {metaLabel ? (
                            <span
                              className="truncate min-w-0"
                              style={{
                                fontSize: "var(--text-totals-item-meta)",
                                letterSpacing: "0.02em",
                                fontWeight: 500,
                                color: cv.text.secondary,
                                lineHeight: 1.25,
                                textTransform: "capitalize",
                              }}
                            >
                              {metaLabel}
                            </span>
                          ) : null}
                        </div>
                        <div
                          className="app-readout tabular-nums whitespace-nowrap"
                          style={{
                            ...TABLE_TEXT,
                            fontSize: "var(--text-totals-item-per-batch)",
                            color: cv.text.secondary,
                            marginTop: 2,
                            lineHeight: 1.2,
                          }}
                        >
                          {formatMixAmount(perBatch, p.isKg)}
                          <span style={{ fontWeight: 500 }}>{p.isKg ? "kg" : "g"}</span>
                          <span>/batch</span>
                        </div>
                      </div>
                    </th>
                    <td
                      className="text-center align-middle"
                      style={{
                        paddingBlock: "var(--totals-cell-py)",
                        paddingInline: "var(--totals-cell-mult-px, 6px)",
                      }}
                    >
                      <span className="tabular-nums" style={MULT_TEXT}>
                        ×{mult}
                      </span>
                    </td>
                    <td
                      className="app-readout text-right align-middle tabular-nums whitespace-nowrap"
                      style={{
                        ...TABLE_TEXT,
                        paddingBlock: "var(--totals-cell-py)",
                        paddingInlineStart: "var(--totals-cell-px)",
                        fontSize: isTotal
                          ? "var(--text-totals-row-amount-total)"
                          : "var(--text-totals-row-amount)",
                        color: amountColor,
                        fontWeight: isTotal ? 700 : 600,
                        lineHeight: 1.15,
                      }}
                    >
                      <AmountCell
                        grams={lineTotal}
                        isKg={p.isKg}
                        colorScheme={colorScheme}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
