import type { ReactNode } from "react";
import { AppHeader } from "../shared/AppHeader";
import { RecipeHeaderSubline, RecipeHeaderSublineStack } from "../mixer/RecipeZoneMeta";

/** Shared chrome for top-level destinations outside the calculator. */
export function DestinationPageChrome({
  title,
  subline,
  onMenuClick,
  embedded = false,
  children,
}: {
  title: string;
  subline?: string;
  onMenuClick: () => void;
  /** Parent AppShell owns mobile-shell / app-frame-host. */
  embedded?: boolean;
  children: ReactNode;
}) {
  const frame = (
    <div
      className="app-frame relative flex flex-col overflow-hidden select-none h-full min-h-0"
      style={{ background: "var(--semantic-surface-app)" }}
    >
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="recipe-context-gradient flex-1 min-h-0 flex flex-col overflow-hidden">
          <AppHeader
            title={title}
            onMenuClick={onMenuClick}
            subline={
              subline ? (
                <RecipeHeaderSublineStack>
                  <RecipeHeaderSubline>
                    <span
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: "var(--text-ui-sm)",
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
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-none app-gutter-x">
            <div className="destination-page__body">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) return frame;

  return (
    <div className="mobile-shell">
      <div className="app-frame-host">{frame}</div>
    </div>
  );
}
