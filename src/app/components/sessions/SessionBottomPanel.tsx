import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { formatMixAmount, MIX_PARAMS } from "../../domain/mix/entities";
import {
  CARD_NAME_WEIGHT,
  entityValueColor,
} from "../../presentation/entityCardStyles";
import { entityAccentColor } from "../../presentation/entityAccent";
import type { ColorScheme } from "../../../theme/appearance";
import type { BlendingRecipe } from "../../domain/recipe/types";
import type { SessionShareScope } from "../../domain/sessions/shareScope";
import type { MixSession, SessionStageId } from "../../sessions/types";
import { SESSION_STAGE_LABELS } from "../../sessions/types";
import { cv } from "../../ui/tokens";
import { SessionShareBar } from "./SessionShareBar";

const PANEL_DRAG_THRESHOLD_PX = 16;
const PANEL_DRAG_FOLLOW = 1;
const PANEL_COLLAPSED_HEIGHT_FALLBACK = 96;
const PANEL_EXPANDED_HEIGHT_FALLBACK = 480;
const PANEL_SHARE_HEIGHT_FALLBACK = 220;

type PanelStage = "collapsed" | "share" | "expanded";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function nearestPanelStage(
  height: number,
  collapsed: number,
  share: number,
  expanded: number,
): PanelStage {
  const candidates: { stage: PanelStage; h: number }[] = [
    { stage: "collapsed", h: collapsed },
    { stage: "share", h: share },
    { stage: "expanded", h: expanded },
  ];
  let best = candidates[0];
  let bestDist = Math.abs(height - best.h);
  for (let i = 1; i < candidates.length; i++) {
    const dist = Math.abs(height - candidates[i].h);
    if (dist < bestDist) {
      best = candidates[i];
      bestDist = dist;
    }
  }
  return best.stage;
}

function shouldBlockHandleDrag(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      ".batch-totals-bottom-panel__actions button, .batch-totals-bottom-panel__actions input, .batch-totals-bottom-panel__actions a, .batch-totals-bottom-panel__body button, .batch-totals-bottom-panel__body input, .batch-totals-bottom-panel__body a",
    ),
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
      className="tabular-nums whitespace-nowrap"
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

function StatusLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: "var(--text-totals-table)",
        fontWeight: 500,
        letterSpacing: "0.12em",
        lineHeight: 1.2,
        textTransform: "uppercase",
        color: cv.text.dimmed,
        padding: "0 var(--totals-section-title-pad-x)",
      }}
    >
      {children}
    </span>
  );
}

function StatusValue({
  children,
  colorScheme,
  accentId,
}: {
  children: ReactNode;
  colorScheme: ColorScheme;
  accentId?: string;
}) {
  return (
    <span
      className="tabular-nums whitespace-nowrap shrink-0"
      style={{
        fontSize: "var(--text-totals-sum)",
        color: accentId
          ? entityAccentColor(accentId, colorScheme)
          : entityValueColor(true, colorScheme),
        fontWeight: 700,
        lineHeight: 1.1,
      }}
    >
      {children}
    </span>
  );
}

function SessionSummaryBar({
  stage,
  sessionName,
  mixCount,
  totalGrams,
  toolCount = 0,
  consumableCount = 0,
  colorScheme,
  compactSummaryRef,
  batchesRelocated = false,
}: {
  stage: SessionStageId;
  sessionName: string;
  mixCount: number;
  totalGrams: number;
  toolCount?: number;
  consumableCount?: number;
  colorScheme: ColorScheme;
  compactSummaryRef: RefObject<HTMLDivElement | null>;
  batchesRelocated?: boolean;
}) {
  const totalParam = MIX_PARAMS[0];

  const left = (() => {
    if (stage === "summary") {
      return (
        <div className="batch-totals-summary-bar__batch-rows min-w-0">
          <div className="batch-totals-summary-bar__batch-row min-w-0">
            <span
              className="truncate min-w-0"
              style={{
                fontSize: "var(--text-totals-table)",
                fontWeight: 600,
                letterSpacing: "0.06em",
                lineHeight: 1.2,
                color: cv.text.secondary,
                padding: "0 var(--totals-section-title-pad-x)",
              }}
            >
              {sessionName}
            </span>
            <span
              className="tabular-nums shrink-0"
              style={{
                fontSize: "var(--text-totals-mult)",
                fontWeight: 600,
                color: cv.text.secondary,
              }}
            >
              ×{mixCount}
            </span>
          </div>
        </div>
      );
    }
    if (batchesRelocated && (stage === "mixes" || stage === "summary")) {
      return (
        <div className="batch-totals-summary-bar__total-label min-w-0 flex items-center">
          <StatusValue colorScheme={colorScheme} accentId={totalParam.id}>
            {totalParam.id}
          </StatusValue>
        </div>
      );
    }
    return (
      <div className="batch-totals-summary-bar__batch-rows min-w-0">
        <div className="batch-totals-summary-bar__batch-row">
          <StatusLabel>{SESSION_STAGE_LABELS[stage]}</StatusLabel>
          {stage === "mixes" ? (
            <span
              className="tabular-nums"
              style={{
                fontSize: "var(--text-totals-mult)",
                fontWeight: 600,
                color: cv.text.secondary,
              }}
            >
              ×{mixCount}
            </span>
          ) : null}
        </div>
      </div>
    );
  })();

  const right = (() => {
    if (stage === "consumption-tools") {
      return (
        <div className="text-right min-w-0 flex flex-col items-end justify-center shrink-0 batch-totals-summary-bar__total">
          <StatusLabel>Total tools</StatusLabel>
          <StatusValue colorScheme={colorScheme}>
            {toolCount > 0 ? toolCount : "—"}
          </StatusValue>
        </div>
      );
    }
    if (stage === "consumables") {
      return (
        <div className="text-right min-w-0 flex flex-col items-end justify-center shrink-0 batch-totals-summary-bar__total">
          <StatusLabel>Total consumables</StatusLabel>
          <StatusValue colorScheme={colorScheme}>
            {consumableCount > 0 ? consumableCount : "—"}
          </StatusValue>
        </div>
      );
    }
    // Mixes + Summary — TOTAL epoxy mass
    return (
      <div className="text-right min-w-0 flex items-center justify-end gap-2 shrink-0 batch-totals-summary-bar__total">
        {!batchesRelocated ? (
          <span
            className="truncate shrink-0"
            style={{
              fontSize: "var(--text-card-name)",
              letterSpacing: "0.18em",
              fontWeight: CARD_NAME_WEIGHT,
              color: entityAccentColor(totalParam.id, colorScheme),
              lineHeight: 1.15,
            }}
          >
            {totalParam.id}
          </span>
        ) : null}
        <StatusValue colorScheme={colorScheme}>
          <AmountCell
            grams={totalGrams}
            isKg={totalParam.isKg}
            colorScheme={colorScheme}
          />
        </StatusValue>
      </div>
    );
  })();

  return (
    <div className="min-w-0 w-full batch-totals-summary-bar">
      <div className="batch-totals-summary-bar__card w-full min-w-0 flex flex-col min-h-0">
        <div
          ref={compactSummaryRef}
          className={`grid items-center min-w-0 w-full batch-totals-summary-bar__grid batch-totals-summary-bar__compact${
            batchesRelocated && (stage === "mixes" || stage === "summary")
              ? " batch-totals-summary-bar__compact--total-only"
              : ""
          }`}
          style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
        >
          {left}
          {right}
        </div>
      </div>
    </div>
  );
}

export function SessionBottomPanel({
  mixCount,
  totalGrams,
  colorScheme,
  sourceExpanded,
  onSourceExpandedChange,
  expandedBody,
  session,
  libraryRecipes,
  shareScope,
  onShareScopeChange,
  onSaveSession,
  saveFlash = false,
  toolCount = 0,
  consumableCount = 0,
}: {
  mixCount: number;
  totalGrams: number;
  colorScheme: ColorScheme;
  sourceExpanded: boolean;
  onSourceExpandedChange: (next: boolean) => void;
  expandedBody: ReactNode;
  session: MixSession;
  libraryRecipes: BlendingRecipe[];
  shareScope: SessionShareScope;
  onShareScopeChange: (scope: SessionShareScope) => void;
  onSaveSession?: () => void;
  saveFlash?: boolean;
  toolCount?: number;
  consumableCount?: number;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [expandAnimating, setExpandAnimating] = useState(false);
  const [tableUiReady, setTableUiReady] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState(PANEL_COLLAPSED_HEIGHT_FALLBACK);
  const [maxExpandHeight, setMaxExpandHeight] = useState(PANEL_EXPANDED_HEIGHT_FALLBACK);
  const [shareActionsHeight, setShareActionsHeight] = useState(PANEL_SHARE_HEIGHT_FALLBACK);
  const [footerGap, setFooterGap] = useState(12);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const actionsInnerRef = useRef<HTMLDivElement>(null);
  const compactSummaryRef = useRef<HTMLDivElement>(null);
  const lastCompactSummaryHeightRef = useRef(PANEL_COLLAPSED_HEIGHT_FALLBACK);
  const dragStartYRef = useRef<number | null>(null);
  const dragStartHeightRef = useRef(0);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const expandSettledRef = useRef(false);

  const shareStageHeight = collapsedHeight + footerGap + shareActionsHeight;
  const settledSheetHeight =
    sourceExpanded || expandAnimating
      ? maxExpandHeight
      : shareOpen
        ? shareStageHeight
        : collapsedHeight;

  const dragging = holding || dragHeight != null;
  const resolvedSheetHeight = dragHeight ?? settledSheetHeight;

  const shareVisibleHeight = (() => {
    if (resolvedSheetHeight <= collapsedHeight + 0.5) return 0;
    if (resolvedSheetHeight >= shareStageHeight - 0.5) return shareActionsHeight;
    return clamp(resolvedSheetHeight - collapsedHeight - footerGap, 0, shareActionsHeight);
  })();

  const isShareRevealing = shareVisibleHeight > 0 || holding;
  const isExpandedVisual =
    sourceExpanded ||
    expandAnimating ||
    (dragging && resolvedSheetHeight > shareStageHeight + 1);

  useEffect(() => {
    if (sourceExpanded) return;
    setTableUiReady(false);
    setExpandAnimating(false);
    expandSettledRef.current = false;
  }, [sourceExpanded]);

  useEffect(() => {
    if (!expandAnimating) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    expandSettledRef.current = false;
    const settleExpand = () => {
      if (expandSettledRef.current) return;
      expandSettledRef.current = true;
      onSourceExpandedChange(true);
      setExpandAnimating(false);
      setTableUiReady(true);
    };
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== sheet || event.propertyName !== "height") return;
      settleExpand();
    };
    sheet.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(settleExpand, 360);
    return () => {
      sheet.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [expandAnimating, onSourceExpandedChange]);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const route = panel?.closest(".batch-totals-route");
    if (!panel || !route) return;

    const measure = () => {
      const headerChrome = route.querySelector(".app-header-chrome");
      const headerBottom =
        headerChrome instanceof HTMLElement
          ? headerChrome.offsetTop + headerChrome.offsetHeight
          : 0;
      const routeTop = route.getBoundingClientRect().top;
      const headerH = Math.max(0, headerBottom - routeTop);
      const nextMax = Math.max(0, route.clientHeight - headerH);
      setMaxExpandHeight(nextMax || PANEL_EXPANDED_HEIGHT_FALLBACK);

      const handleEl = handleRef.current;
      const handleStyles = handleEl ? getComputedStyle(handleEl) : null;
      const handleMarginBottom = handleStyles ? parseFloat(handleStyles.marginBottom) || 0 : 0;
      const handleH = Math.max(0, (handleEl?.offsetHeight ?? 0) + handleMarginBottom);
      const footer = footerRef.current;
      const screen = route.querySelector(".batch-totals-screen");
      const screenStyles = screen instanceof HTMLElement ? getComputedStyle(screen) : null;
      const tokenHeight = screenStyles
        ? parseFloat(screenStyles.getPropertyValue("--batch-totals-summary-h-dual"))
        : 0;
      if (tokenHeight > 0) lastCompactSummaryHeightRef.current = tokenHeight;
      const summaryH = tokenHeight > 0 ? tokenHeight : lastCompactSummaryHeightRef.current;
      const footerStyles = footer ? getComputedStyle(footer) : null;
      const footerPad = footerStyles ? parseFloat(footerStyles.paddingBottom) || 0 : 0;
      const nextCollapsed = handleH + summaryH + footerPad;
      if (nextCollapsed > 0) setCollapsedHeight(nextCollapsed);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(route);
    if (handleRef.current) ro.observe(handleRef.current);
    if (footerRef.current) ro.observe(footerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [sourceExpanded, shareOpen, mixCount, tableUiReady]);

  useLayoutEffect(() => {
    const el = actionsInnerRef.current;
    if (!el) return;
    const measure = () => {
      setShareActionsHeight(el.scrollHeight || PANEL_SHARE_HEIGHT_FALLBACK);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [
    mixCount,
    session.batches.length,
    session.name,
    session.updatedAt,
    session.activeStage,
    shareScope,
  ]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => {
      const raw = getComputedStyle(panel).getPropertyValue("--batch-totals-footer-gap").trim();
      const px = parseFloat(raw);
      if (px > 0) setFooterGap(px);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!sourceExpanded && !shareOpen && !expandAnimating) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (sourceExpanded || expandAnimating) {
        setTableUiReady(false);
        setExpandAnimating(false);
        expandSettledRef.current = true;
        if (sourceExpanded) onSourceExpandedChange(false);
        return;
      }
      setShareOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sourceExpanded, shareOpen, expandAnimating, onSourceExpandedChange]);

  useLayoutEffect(() => {
    const screen = panelRef.current?.closest(".batch-totals-screen");
    if (!(screen instanceof HTMLElement)) return;
    screen.style.setProperty("--batch-totals-panel-reserve", `${resolvedSheetHeight}px`);
  }, [resolvedSheetHeight]);

  const applyPanelStage = useCallback(
    (stage: PanelStage) => {
      if (stage === "expanded") {
        setShareOpen(true);
        if (!sourceExpanded) setExpandAnimating(true);
        else setTableUiReady(true);
        return;
      }
      setTableUiReady(false);
      setExpandAnimating(false);
      expandSettledRef.current = true;
      if (sourceExpanded) onSourceExpandedChange(false);
      setShareOpen(stage === "share");
    },
    [onSourceExpandedChange, sourceExpanded],
  );

  const finishHandleDrag = useCallback(
    (clientY: number) => {
      const startY = dragStartYRef.current;
      const startHeight = dragStartHeightRef.current;
      dragStartYRef.current = null;
      setHolding(false);
      setDragHeight(null);
      if (startY == null) return;
      const dy = clientY - startY;
      if (Math.abs(dy) < PANEL_DRAG_THRESHOLD_PX) return;
      const liveHeight = clamp(
        startHeight - dy * PANEL_DRAG_FOLLOW,
        collapsedHeight,
        maxExpandHeight,
      );
      applyPanelStage(
        nearestPanelStage(liveHeight, collapsedHeight, shareStageHeight, maxExpandHeight),
      );
    },
    [applyPanelStage, collapsedHeight, maxExpandHeight, shareStageHeight],
  );

  const handleDragPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (shouldBlockHandleDrag(event.target)) return;
      if (event.button !== 0) return;
      event.preventDefault();
      dragCleanupRef.current?.();
      dragStartYRef.current = event.clientY;
      dragStartHeightRef.current = settledSheetHeight;
      setDragHeight(settledSheetHeight);
      setHolding(true);

      const onMove = (ev: PointerEvent) => {
        const startY = dragStartYRef.current;
        if (startY == null) return;
        const dy = (ev.clientY - startY) * PANEL_DRAG_FOLLOW;
        setDragHeight(
          clamp(dragStartHeightRef.current - dy, collapsedHeight, maxExpandHeight),
        );
      };
      const onEnd = (ev: PointerEvent) => {
        finishHandleDrag(ev.clientY);
        cleanup();
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        dragCleanupRef.current = null;
      };
      dragCleanupRef.current = cleanup;
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [collapsedHeight, finishHandleDrag, maxExpandHeight, settledSheetHeight],
  );

  return (
    <div
      ref={panelRef}
      id="session-bottom-panel"
      className={`batch-totals-bottom-panel${
        isExpandedVisual ? " batch-totals-bottom-panel--source-expanded" : ""
      }${isExpandedVisual ? " batch-totals-bottom-panel--table-revealing" : ""}${
        shareOpen || isShareRevealing ? " batch-totals-bottom-panel--share-open" : ""
      }${isShareRevealing ? " batch-totals-bottom-panel--share-revealing" : ""}${
        holding ? " batch-totals-bottom-panel--holding" : ""
      }`}
    >
      <div
        ref={sheetRef}
        className="batch-totals-bottom-panel__sheet"
        style={{
          height: resolvedSheetHeight,
          transition: holding ? "none" : "height 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          className="batch-totals-bottom-panel__content"
          role="region"
          aria-expanded={sourceExpanded}
          aria-label="Session summary"
        >
          <div
            ref={handleRef}
            className="batch-totals-bottom-panel__drag-zone"
            onPointerDown={handleDragPointerDown}
          >
            <div
              className={`batch-totals-grab-handle${holding ? " batch-totals-grab-handle--holding" : ""}`}
              aria-hidden
            >
              <span className="batch-totals-grab-handle__pill" />
            </div>
          </div>

          {isExpandedVisual ? (
            <div
              className="batch-totals-bottom-panel__body app-gutter-x batch-totals-bottom-panel__body--readonly"
              aria-label="Session summary — total per ingredient"
            >
              <div className="batch-totals-bottom-panel__body-inner">{expandedBody}</div>
            </div>
          ) : null}

          <div ref={footerRef} className="batch-totals-bottom-panel__footer shrink-0 min-h-0">
            <div className="batch-totals-bottom-panel__card-region app-gutter-x">
              <SessionSummaryBar
                stage={session.activeStage}
                sessionName={session.name}
                mixCount={mixCount}
                totalGrams={totalGrams}
                toolCount={toolCount}
                consumableCount={consumableCount}
                colorScheme={colorScheme}
                compactSummaryRef={compactSummaryRef}
                batchesRelocated={isExpandedVisual}
              />
            </div>

            <div
              className={`batch-totals-bottom-panel__actions app-gutter-x${
                holding ? " batch-totals-bottom-panel__actions--live" : ""
              }`}
              aria-hidden={!isShareRevealing}
              style={{
                height: shareVisibleHeight,
                overflow: "hidden",
                transition: holding
                  ? "none"
                  : "height 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div ref={actionsInnerRef} className="batch-totals-bottom-panel__actions-inner">
                <SessionShareBar
                  session={session}
                  libraryRecipes={libraryRecipes}
                  shareScope={shareScope}
                  onShareScopeChange={onShareScopeChange}
                  onSave={onSaveSession}
                  saveFlash={saveFlash}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
