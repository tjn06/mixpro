import type { ReactNode } from "react";
import { AppHeader } from "../shared/AppHeader";
import { RecipeHeaderSubline, RecipeHeaderSublineStack } from "../mixer/RecipeZoneMeta";

/** Shared chrome for top-level destinations outside the calculator. */
export function DestinationPageChrome({
  title,
  subline,
  onMenuClick,
  onBack,
  backLabel,
  backImmediate = false,
  embedded = false,
  subnav,
  bottomSheet,
  children,
}: {
  title: string;
  subline?: string;
  onMenuClick: () => void;
  onBack?: () => void;
  backLabel?: string;
  /** Tap back (Settings overlay) instead of long-press. */
  backImmediate?: boolean;
  /** Parent AppShell owns mobile-shell / app-frame-host. */
  embedded?: boolean;
  /** Compact controls pinned under the header (outside the scroll column). */
  subnav?: ReactNode;
  /**
   * Session-style stage bottom sheet. When set, the page uses the same
   * `batch-totals-route` / screen layout as session steps (panel reserves scroll space).
   */
  bottomSheet?: ReactNode;
  children: ReactNode;
}) {
  const header = (
    <AppHeader
      title={title}
      onMenuClick={onMenuClick}
      onBack={onBack}
      backLabel={backLabel}
      backImmediate={backImmediate}
      subline={
        subline ? (
          <RecipeHeaderSublineStack>
            <RecipeHeaderSubline>
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "var(--text-page-section)",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ui-recipe-value)",
                }}
              >
                {subline}
              </span>
            </RecipeHeaderSubline>
          </RecipeHeaderSublineStack>
        ) : undefined
      }
    />
  );

  const subnavRow = subnav ? (
    <div className="destination-page__subnav app-gutter-x">{subnav}</div>
  ) : null;

  /** Hub layout: header + optional subnav + screen (sheet and/or fill content). */
  const useHubLayout = Boolean(bottomSheet || subnav);

  const frame = (
    <div
      className="app-frame relative flex flex-col overflow-hidden select-none h-full min-h-0"
      style={{ background: "var(--semantic-surface-app)" }}
    >
      {useHubLayout ? (
        <div className="batch-totals-route flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="recipe-context-gradient flex-1 min-h-0 flex flex-col overflow-hidden">
            {header}
            {subnavRow}
            <div className="batch-totals-screen flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden relative">
              <div className="batch-totals-screen__main flex flex-col">
                {bottomSheet ? (
                  <div className="batch-totals-scroll-fade-viewport flex flex-col">
                    <div className="batch-totals-scroll-panel flex flex-col">
                      <div className="batch-totals-scroll-panel__inner app-gutter-x">
                        <div className="destination-page__body destination-page__body--in-sheet">
                          {children}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="destination-page__fill app-gutter-x">
                    <div className="destination-page__body destination-page__body--fill">
                      {children}
                    </div>
                  </div>
                )}
              </div>
              {bottomSheet}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="recipe-context-gradient flex-1 min-h-0 flex flex-col overflow-hidden">
            {header}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-none app-gutter-x">
              <div className="destination-page__body">{children}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return frame;

  return (
    <div className="mobile-shell">
      <div className="app-frame-host">{frame}</div>
    </div>
  );
}
