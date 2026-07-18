import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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

/**
 * Three-stage bottom sheet used by session steps and catalog Select:
 * collapsed summary → share dock → expanded details.
 */
export function StageBottomSheet({
  sourceExpanded,
  onSourceExpandedChange,
  summary,
  shareActions,
  expandedBody,
  regionLabel = "Summary",
  expandedBodyLabel = "Details",
  panelId = "stage-bottom-panel",
  remeasureKey,
}: {
  sourceExpanded: boolean;
  onSourceExpandedChange: (next: boolean) => void;
  summary:
    | ReactNode
    | ((ctx: { batchesRelocated: boolean }) => ReactNode);
  shareActions: ReactNode;
  expandedBody: ReactNode;
  regionLabel?: string;
  expandedBodyLabel?: string;
  panelId?: string;
  /** Bump when summary/share content size may change. */
  remeasureKey?: string | number;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [expandAnimating, setExpandAnimating] = useState(false);
  const [tableUiReady, setTableUiReady] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState(
    PANEL_COLLAPSED_HEIGHT_FALLBACK,
  );
  const [maxExpandHeight, setMaxExpandHeight] = useState(
    PANEL_EXPANDED_HEIGHT_FALLBACK,
  );
  const [shareActionsHeight, setShareActionsHeight] = useState(
    PANEL_SHARE_HEIGHT_FALLBACK,
  );
  const [footerGap, setFooterGap] = useState(12);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const actionsInnerRef = useRef<HTMLDivElement>(null);
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
    return clamp(
      resolvedSheetHeight - collapsedHeight - footerGap,
      0,
      shareActionsHeight,
    );
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
      /**
       * Cap expand to the screen under header (+ optional subnav), not the full
       * route. Catalog hubs pin Report/Edit under the header; expanding to
       * route−header alone covers that strip.
       */
      const screen = route.querySelector(".batch-totals-screen");
      const headerChrome = route.querySelector(".app-header-chrome");
      const headerBottom =
        headerChrome instanceof HTMLElement
          ? headerChrome.offsetTop + headerChrome.offsetHeight
          : 0;
      const routeTop = route.getBoundingClientRect().top;
      const headerH = Math.max(0, headerBottom - routeTop);
      const screenH =
        screen instanceof HTMLElement ? screen.clientHeight : 0;
      const nextMax =
        screenH > 0
          ? screenH
          : Math.max(0, route.clientHeight - headerH);
      setMaxExpandHeight(nextMax || PANEL_EXPANDED_HEIGHT_FALLBACK);

      const handleEl = handleRef.current;
      const handleStyles = handleEl ? getComputedStyle(handleEl) : null;
      const handleMarginBottom = handleStyles
        ? parseFloat(handleStyles.marginBottom) || 0
        : 0;
      const handleH = Math.max(
        0,
        (handleEl?.offsetHeight ?? 0) + handleMarginBottom,
      );
      const footer = footerRef.current;
      const screenStyles =
        screen instanceof HTMLElement ? getComputedStyle(screen) : null;
      const tokenHeight = screenStyles
        ? parseFloat(
            screenStyles.getPropertyValue("--batch-totals-summary-h-dual"),
          )
        : 0;
      if (tokenHeight > 0) lastCompactSummaryHeightRef.current = tokenHeight;
      const summaryH =
        tokenHeight > 0 ? tokenHeight : lastCompactSummaryHeightRef.current;
      const footerStyles = footer ? getComputedStyle(footer) : null;
      const footerPad = footerStyles
        ? parseFloat(footerStyles.paddingBottom) || 0
        : 0;
      const nextCollapsed = handleH + summaryH + footerPad;
      if (nextCollapsed > 0) setCollapsedHeight(nextCollapsed);
    };

    measure();
    const screenEl = route.querySelector(".batch-totals-screen");
    const ro = new ResizeObserver(measure);
    ro.observe(route);
    if (screenEl instanceof HTMLElement) ro.observe(screenEl);
    if (handleRef.current) ro.observe(handleRef.current);
    if (footerRef.current) ro.observe(footerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [sourceExpanded, shareOpen, tableUiReady, remeasureKey]);

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
  }, [remeasureKey]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => {
      const raw = getComputedStyle(panel)
        .getPropertyValue("--batch-totals-footer-gap")
        .trim();
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
    screen.style.setProperty(
      "--batch-totals-panel-reserve",
      `${resolvedSheetHeight}px`,
    );
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
        nearestPanelStage(
          liveHeight,
          collapsedHeight,
          shareStageHeight,
          maxExpandHeight,
        ),
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
          clamp(
            dragStartHeightRef.current - dy,
            collapsedHeight,
            maxExpandHeight,
          ),
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
      id={panelId}
      className={`batch-totals-bottom-panel${
        isExpandedVisual ? " batch-totals-bottom-panel--source-expanded" : ""
      }${isExpandedVisual ? " batch-totals-bottom-panel--table-revealing" : ""}${
        shareOpen || isShareRevealing
          ? " batch-totals-bottom-panel--share-open"
          : ""
      }${isShareRevealing ? " batch-totals-bottom-panel--share-revealing" : ""}${
        holding ? " batch-totals-bottom-panel--holding" : ""
      }`}
    >
      <div
        ref={sheetRef}
        className="batch-totals-bottom-panel__sheet"
        style={{
          height: resolvedSheetHeight,
          transition: holding
            ? "none"
            : "height 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          className="batch-totals-bottom-panel__content"
          role="region"
          aria-expanded={sourceExpanded}
          aria-label={regionLabel}
        >
          <div
            ref={handleRef}
            className="batch-totals-bottom-panel__drag-zone"
            onPointerDown={handleDragPointerDown}
          >
            <div
              className={`batch-totals-grab-handle${
                holding ? " batch-totals-grab-handle--holding" : ""
              }`}
              aria-hidden
            >
              <span className="batch-totals-grab-handle__pill" />
            </div>
          </div>

          {isExpandedVisual ? (
            <div
              className="batch-totals-bottom-panel__body app-gutter-x batch-totals-bottom-panel__body--readonly"
              aria-label={expandedBodyLabel}
            >
              <div className="batch-totals-bottom-panel__body-inner">
                {expandedBody}
              </div>
            </div>
          ) : null}

          <div
            ref={footerRef}
            className="batch-totals-bottom-panel__footer shrink-0 min-h-0"
          >
            <div className="batch-totals-bottom-panel__card-region app-gutter-x">
              {typeof summary === "function"
                ? summary({ batchesRelocated: isExpandedVisual })
                : summary}
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
              <div
                ref={actionsInnerRef}
                className="batch-totals-bottom-panel__actions-inner"
              >
                {shareActions}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
