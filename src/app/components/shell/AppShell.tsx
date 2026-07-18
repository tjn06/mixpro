import { useCallback, useMemo, useState } from "react";
import { BatchMixer, type SessionMixCommitPayload } from "../../BatchMixer";
import type { CreateRecipeEntryContext } from "../../domain/recipe/createFromInputs";
import {
  DEFAULT_RECIPE,
  PRESET_RECIPES,
  recipeMenuLabel,
  type BlendingRecipe,
} from "../../domain/recipe/types";
import { resolveSessionBatchRecipe } from "../../domain/sessions/totals";
import { useThemeAppearanceSync } from "../../hooks/useThemeAppearanceSync";
import type { AppDestination } from "../../navigation/types";
import { useRecipeLibraryStore } from "../../recipe-library/store";
import { gramsFromSlotValues, slotValuesFromGrams } from "../../saved-batch-totals/batches";
import { useSessionsStore } from "../../sessions/store";
import { AppNavDrawer } from "../nav/AppNavDrawer";
import { CreateRecipeScreen } from "../recipe/CreateRecipeScreen";
import { RecipesPage } from "../pages/RecipesPage";
import { SessionsPage } from "../pages/SessionsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { ConsumablesPage } from "../pages/ConsumablesPage";
import { ToolsPage } from "../pages/ToolsPage";
import { SessionOverviewScreen } from "../sessions/SessionOverviewScreen";

type ShellView =
  | { kind: "destination"; id: AppDestination }
  | {
      kind: "create-recipe";
      context: CreateRecipeEntryContext;
      returnTo: AppDestination | { kind: "session-overview"; sessionId: string };
    }
  | { kind: "session-overview"; sessionId: string }
  | {
      kind: "session-mix-editor";
      sessionId: string;
      mode: "add" | "edit";
      recipe: BlendingRecipe;
      batchId?: string;
      batchName?: string;
      initialValues?: number[];
    };

function destinationFromView(view: ShellView): AppDestination {
  if (view.kind === "destination") return view.id;
  if (view.kind === "create-recipe") {
    return typeof view.returnTo === "string" ? view.returnTo : "sessions";
  }
  return "sessions";
}

/** App root — top-level destinations; Calculator remains the default non-session mode. */
export function AppShell() {
  /** Theme sync must live here — not only on Calculator — or remounting BatchMixer re-applies defaults. */
  useThemeAppearanceSync();

  const [view, setView] = useState<ShellView>({ kind: "destination", id: "calculator" });
  const [navOpen, setNavOpen] = useState(false);
  /** Settings overlays the current screen — never replaces `view`. */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const sessions = useSessionsStore((s) => s.sessions);
  const addSessionBatch = useSessionsStore((s) => s.addSessionBatch);
  const updateSessionBatch = useSessionsStore((s) => s.updateSessionBatch);
  const setActiveSession = useSessionsStore((s) => s.setActiveSession);
  const userRecipes = useRecipeLibraryStore((s) => s.userRecipes);

  const destination = destinationFromView(view);

  const sessionChrome =
    view.kind === "session-overview" ||
    view.kind === "session-mix-editor" ||
    (view.kind === "create-recipe" && view.context.source === "session");

  const libraryRecipes = useMemo(() => {
    const user = Array.isArray(userRecipes) ? userRecipes : [];
    return [...PRESET_RECIPES, ...user];
  }, [userRecipes]);

  const activeSession =
    view.kind === "session-overview" || view.kind === "session-mix-editor"
      ? sessions.find((s) => s.id === view.sessionId) ?? null
      : sessions.find((s) => s.id === activeSessionId) ?? null;

  const sessionMixerRecipes = useMemo(() => {
    const sessionRecipes = activeSession?.sessionRecipes ?? [];
    const byId = new Map<string, BlendingRecipe>();
    for (const recipe of [...libraryRecipes, ...sessionRecipes]) {
      byId.set(recipe.id, recipe);
    }
    if (view.kind === "session-mix-editor") {
      byId.set(view.recipe.id, view.recipe);
    }
    return [...byId.values()];
  }, [libraryRecipes, activeSession, view]);

  const openNav = useCallback(() => setNavOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  const leaveFocusedFlow = useCallback(
    (next: ShellView) => {
      if (view.kind === "session-mix-editor") {
        const ok = window.confirm(
          view.mode === "edit"
            ? "Leave and discard changes to this mix?"
            : "Leave and discard this mix?",
        );
        if (!ok) return false;
      }
      if (view.kind === "create-recipe") {
        const ok = window.confirm("Discard this recipe?");
        if (!ok) return false;
      }
      setView(next);
      return true;
    },
    [view],
  );

  const openSettings = useCallback(() => {
    setNavOpen(false);
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const goDestination = useCallback(
    (id: AppDestination) => {
      if (id === "settings") {
        openSettings();
        return;
      }
      const next: ShellView = { kind: "destination", id };
      if (view.kind === "destination") {
        setSettingsOpen(false);
        setView(next);
        setNavOpen(false);
        return;
      }
      if (!leaveFocusedFlow(next)) return;
      setSettingsOpen(false);
      setNavOpen(false);
    },
    [view.kind, leaveFocusedFlow, openSettings],
  );

  const openCreateRecipe = useCallback(
    (
      context: CreateRecipeEntryContext,
      returnTo: AppDestination | { kind: "session-overview"; sessionId: string },
    ) => {
      setView({ kind: "create-recipe", context, returnTo });
      setNavOpen(false);
    },
    [],
  );

  const openSessionOverview = useCallback((sessionId: string) => {
    setActiveSession(sessionId);
    setView({ kind: "session-overview", sessionId });
    setNavOpen(false);
  }, [setActiveSession]);

  const handleMixCommit = useCallback(
    (payload: SessionMixCommitPayload) => {
      if (view.kind !== "session-mix-editor") return;
      const { sessionId, mode, batchId } = view;
      const values = slotValuesFromGrams(payload.values);
      if (mode === "edit" && batchId) {
        updateSessionBatch(sessionId, batchId, {
          name: payload.name,
          recipeId: payload.recipe.id,
          recipeName: recipeMenuLabel(payload.recipe),
          recipe: payload.recipe,
          values,
        });
      } else {
        addSessionBatch(sessionId, {
          name: payload.name,
          recipeId: payload.recipe.id,
          recipeName: recipeMenuLabel(payload.recipe),
          recipe: payload.recipe,
          values,
          multiplier: 1,
        });
      }
      setView({ kind: "session-overview", sessionId });
    },
    [view, addSessionBatch, updateSessionBatch],
  );

  const returnFromCreateRecipe = useCallback(() => {
    if (view.kind !== "create-recipe") return;
    if (typeof view.returnTo === "string") {
      setView({ kind: "destination", id: view.returnTo });
      return;
    }
    setView(view.returnTo);
  }, [view]);

  return (
    <div className="mobile-shell">
      <div className="app-frame-host relative">
        {view.kind === "create-recipe" ? (
          <CreateRecipeScreen
            embedded
            context={view.context}
            onMenuClick={openNav}
            onBack={returnFromCreateRecipe}
            onSaved={returnFromCreateRecipe}
          />
        ) : null}

        {view.kind === "session-overview" ? (
          <SessionOverviewScreen
            embedded
            sessionId={view.sessionId}
            onMenuClick={openNav}
            onBack={() => setView({ kind: "destination", id: "sessions" })}
            onCreateRecipe={() =>
              openCreateRecipe(
                { source: "session", sessionId: view.sessionId },
                { kind: "session-overview", sessionId: view.sessionId },
              )
            }
            onAddMix={(recipe) =>
              setView({
                kind: "session-mix-editor",
                sessionId: view.sessionId,
                mode: "add",
                recipe,
              })
            }
            onEditMix={(batchId) => {
              const session = sessions.find((s) => s.id === view.sessionId);
              const batch = session?.batches.find((b) => b.id === batchId);
              if (!session || !batch) return;
              const recipe =
                resolveSessionBatchRecipe(
                  batch,
                  session.sessionRecipes,
                  libraryRecipes,
                ) ?? DEFAULT_RECIPE;
              setView({
                kind: "session-mix-editor",
                sessionId: view.sessionId,
                mode: "edit",
                recipe,
                batchId,
                batchName: batch.name,
                initialValues: gramsFromSlotValues(batch.values),
              });
            }}
          />
        ) : null}

        {view.kind === "session-mix-editor" ? (
          <BatchMixer
            embedded
            recipe={view.recipe}
            recipes={sessionMixerRecipes}
            initialValues={view.initialValues}
            onOpenNav={openNav}
            sessionMode={{
              sessionName: activeSession?.name ?? "Session",
              mode: view.mode,
              batchName: view.batchName,
              onCommit: handleMixCommit,
              onCancel: () =>
                setView({ kind: "session-overview", sessionId: view.sessionId }),
            }}
          />
        ) : null}

        {view.kind === "destination" && view.id === "calculator" ? (
          <BatchMixer
            recipe={DEFAULT_RECIPE}
            embedded
            onOpenNav={openNav}
          />
        ) : null}

        {view.kind === "destination" && view.id === "sessions" ? (
          <SessionsPage
            embedded
            onMenuClick={openNav}
            onOpenSession={openSessionOverview}
          />
        ) : null}

        {view.kind === "destination" && view.id === "recipes" ? (
          <RecipesPage
            embedded
            onMenuClick={openNav}
            onCreateRecipe={() =>
              openCreateRecipe({ source: "library" }, "recipes")
            }
          />
        ) : null}

        {view.kind === "destination" && view.id === "tools" ? (
          <ToolsPage embedded onMenuClick={openNav} />
        ) : null}

        {view.kind === "destination" && view.id === "consumables" ? (
          <ConsumablesPage embedded onMenuClick={openNav} />
        ) : null}

        {settingsOpen ? (
          <div
            className="absolute inset-0"
            style={{ zIndex: 50 }}
            role="presentation"
          >
            <SettingsPage
              embedded
              onMenuClick={openNav}
              onClose={closeSettings}
            />
          </div>
        ) : null}

        <AppNavDrawer
          open={navOpen}
          active={settingsOpen ? "settings" : destination}
          sessionChrome={sessionChrome}
          onClose={closeNav}
          onNavigate={goDestination}
        />
      </div>
    </div>
  );
}
