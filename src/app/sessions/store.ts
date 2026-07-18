import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BlendingRecipe } from "../domain/recipe/types";
import { normalizeFlexSelectSelection } from "../domain/select/selection";
import type {
  CreateSessionInput,
  MixSession,
  SessionBatchItem,
  SessionStageId,
} from "./types";
import { SESSION_STAGE_ORDER } from "./types";

const STORAGE_KEY = "mixmate-sessions";
const HOT_STORE_KEY = "__mixmate_sessions_store__";
const MAX_SESSIONS = 40;

function nowIso(): string {
  return new Date().toISOString();
}

function defaultSessionName(): string {
  return "Untitled session";
}

function normalizeTouchedStages(
  touched: SessionStageId[] | undefined,
  activeStage: SessionStageId,
): SessionStageId[] {
  const allowed = new Set(SESSION_STAGE_ORDER);
  const next: SessionStageId[] = [];
  for (const id of touched ?? []) {
    if (allowed.has(id) && !next.includes(id)) next.push(id);
  }
  if (!next.includes(activeStage)) next.push(activeStage);
  if (!next.includes("mixes")) next.unshift("mixes");
  return next;
}

function createEmptySession(input: CreateSessionInput = {}): MixSession {
  const ts = nowIso();
  return {
    id: crypto.randomUUID(),
    name: input.name?.trim() || defaultSessionName(),
    status: "draft",
    activeStage: "mixes",
    touchedStages: ["mixes"],
    batches: [],
    sessionRecipes: [],
    selectedToolQtys: {},
    customTools: [],
    selectedConsumableQtys: {},
    customConsumables: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

function normalizeSession(session: MixSession): MixSession {
  const activeStage = session.activeStage ?? "mixes";
  return {
    ...session,
    activeStage,
    touchedStages: normalizeTouchedStages(session.touchedStages, activeStage),
    sessionRecipes: session.sessionRecipes ?? [],
    batches: session.batches ?? [],
    selectedToolQtys: normalizeFlexSelectSelection(
      session.selectedToolQtys,
      session.selectedToolIds,
    ),
    customTools: Array.isArray(session.customTools) ? session.customTools : [],
    selectedConsumableQtys: normalizeFlexSelectSelection(
      session.selectedConsumableQtys,
      session.selectedConsumableIds,
    ),
    customConsumables: Array.isArray(session.customConsumables)
      ? session.customConsumables
      : [],
  };
}

interface SessionsState {
  sessions: MixSession[];
  /** Currently open session id (null = none). */
  activeSessionId: string | null;
  createSession: (input?: CreateSessionInput) => MixSession;
  setActiveSession: (id: string | null) => void;
  /** Silent draft persistence — bumps updatedAt. */
  patchSession: (
    id: string,
    patch: Partial<
      Pick<
        MixSession,
        | "name"
        | "activeStage"
        | "touchedStages"
        | "batches"
        | "sessionRecipes"
        | "selectedToolQtys"
        | "customTools"
        | "selectedConsumableQtys"
        | "customConsumables"
      >
    >,
  ) => void;
  addSessionRecipe: (sessionId: string, recipe: BlendingRecipe) => void;
  addSessionBatch: (
    sessionId: string,
    batch: Omit<SessionBatchItem, "id" | "createdAt" | "updatedAt">,
  ) => SessionBatchItem | null;
  updateSessionBatch: (
    sessionId: string,
    batchId: string,
    patch: Partial<
      Pick<
        SessionBatchItem,
        "name" | "recipeId" | "recipeName" | "recipe" | "values" | "multiplier"
      >
    >,
  ) => void;
  removeSessionBatch: (sessionId: string, batchId: string) => void;
  /** Explicit Save Session from dock — marks saved. */
  saveSession: (id: string, name?: string) => void;
  deleteSession: (id: string) => void;
}

function createSessionsStore() {
  return create<SessionsState>()(
    persist(
      (set, get) => ({
        sessions: [],
        activeSessionId: null,

        createSession: (input) => {
          const session = createEmptySession(input);
          set({
            sessions: [session, ...get().sessions].slice(0, MAX_SESSIONS),
            activeSessionId: session.id,
          });
          return session;
        },

        setActiveSession: (id) => {
          set({ activeSessionId: id });
        },

        patchSession: (id, patch) => {
          const ts = nowIso();
          set({
            sessions: get().sessions.map((session) => {
              if (session.id !== id) return session;
              const normalized = normalizeSession(session);
              const nextActive = patch.activeStage ?? normalized.activeStage;
              const touchedStages = normalizeTouchedStages(
                patch.touchedStages ?? normalized.touchedStages,
                nextActive,
              );
              return {
                ...normalized,
                ...patch,
                activeStage: nextActive,
                touchedStages,
                updatedAt: ts,
                status: session.status === "saved" ? "saved" : "draft",
              };
            }),
          });
        },

        addSessionRecipe: (sessionId, recipe) => {
          const ts = nowIso();
          set({
            sessions: get().sessions.map((session) => {
              if (session.id !== sessionId) return session;
              const normalized = normalizeSession(session);
              return {
                ...normalized,
                sessionRecipes: [recipe, ...normalized.sessionRecipes],
                updatedAt: ts,
              };
            }),
          });
        },

        addSessionBatch: (sessionId, batch) => {
          const ts = nowIso();
          const next: SessionBatchItem = {
            ...batch,
            id: crypto.randomUUID(),
            multiplier: Math.max(1, Math.round(batch.multiplier) || 1),
            createdAt: ts,
            updatedAt: ts,
          };
          let created: SessionBatchItem | null = null;
          set({
            sessions: get().sessions.map((session) => {
              if (session.id !== sessionId) return session;
              const normalized = normalizeSession(session);
              created = next;
              return {
                ...normalized,
                batches: [...normalized.batches, next],
                updatedAt: ts,
                status: normalized.status === "saved" ? "saved" : "draft",
              };
            }),
          });
          return created;
        },

        updateSessionBatch: (sessionId, batchId, patch) => {
          const ts = nowIso();
          set({
            sessions: get().sessions.map((session) => {
              if (session.id !== sessionId) return session;
              const normalized = normalizeSession(session);
              return {
                ...normalized,
                batches: normalized.batches.map((batch) =>
                  batch.id === batchId
                    ? {
                        ...batch,
                        ...patch,
                        multiplier:
                          patch.multiplier != null
                            ? Math.max(1, Math.round(patch.multiplier) || 1)
                            : batch.multiplier,
                        updatedAt: ts,
                      }
                    : batch,
                ),
                updatedAt: ts,
                status: normalized.status === "saved" ? "saved" : "draft",
              };
            }),
          });
        },

        removeSessionBatch: (sessionId, batchId) => {
          const ts = nowIso();
          set({
            sessions: get().sessions.map((session) => {
              if (session.id !== sessionId) return session;
              const normalized = normalizeSession(session);
              return {
                ...normalized,
                batches: normalized.batches.filter((b) => b.id !== batchId),
                updatedAt: ts,
                status: normalized.status === "saved" ? "saved" : "draft",
              };
            }),
          });
        },

        saveSession: (id, name) => {
          const ts = nowIso();
          set({
            sessions: get().sessions.map((session) => {
              if (session.id !== id) return session;
              return {
                ...session,
                name: name?.trim() || session.name,
                status: "saved",
                updatedAt: ts,
              };
            }),
          });
        },

        deleteSession: (id) => {
          const { sessions, activeSessionId } = get();
          set({
            sessions: sessions.filter((s) => s.id !== id),
            activeSessionId: activeSessionId === id ? null : activeSessionId,
          });
        },
      }),
      {
        name: STORAGE_KEY,
        version: 3,
        migrate: (persisted) => {
          const data = persisted as {
            sessions?: MixSession[];
            activeSessionId?: string | null;
          } | undefined;
          return {
            sessions: (data?.sessions ?? []).map(normalizeSession),
            activeSessionId: data?.activeSessionId ?? null,
          };
        },
        partialize: (state) => ({
          sessions: state.sessions,
          activeSessionId: state.activeSessionId,
        }),
      },
    ),
  );
}

type SessionsStore = ReturnType<typeof createSessionsStore>;

const hotData = import.meta.hot?.data as { [HOT_STORE_KEY]?: SessionsStore } | undefined;

export const useSessionsStore: SessionsStore =
  hotData?.[HOT_STORE_KEY] ?? createSessionsStore();

if (import.meta.hot) {
  import.meta.hot.data[HOT_STORE_KEY] = useSessionsStore;
}

export function selectActiveSession(state: SessionsState): MixSession | null {
  if (!state.activeSessionId) return null;
  return state.sessions.find((s) => s.id === state.activeSessionId) ?? null;
}
