import type { DemoState, Role } from "./types";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { demoNow } from "./clock";
import { DEMO_VERSION, createSeedState } from "./seed";
import { upgradeDemoData } from "./upgrade";

import { readStored, writeStored } from "@/lib/storage";

const STORAGE_KEY = "sk.demo";

function loadState(): DemoState {
  const stored = readStored<DemoState | null>(STORAGE_KEY, null);

  if (stored?.version !== DEMO_VERSION) return createSeedState();

  return { ...stored, data: upgradeDemoData(stored.data) };
}

interface DemoContextValue {
  state: DemoState;
  setRole: (role: Role) => void;
  reset: () => void;
  /** Replace the data with an updated copy; later steps add their actions on top of this. */
  update: (recipe: (state: DemoState) => DemoState) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(loadState);

  useEffect(() => {
    writeStored(STORAGE_KEY, state);
  }, [state]);

  const update = useCallback((recipe: (s: DemoState) => DemoState) => {
    setState((current) => recipe(current));
  }, []);

  const setRole = useCallback(
    (role: Role) => update((s) => ({ ...s, role })),
    [update],
  );

  // Keeps the current role so the presenter stays where they are.
  const reset = useCallback(
    () => update((s) => ({ ...createSeedState(), role: s.role })),
    [update],
  );

  const value = useMemo(
    () => ({ state, setRole, reset, update }),
    [state, setRole, reset, update],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);

  if (!context) throw new Error("useDemo must be used inside DemoProvider");

  return context;
}

/** Current demo time, refreshed every 30 seconds for countdowns and "due in" labels. */
export function useDemoNow(): Date {
  const { state } = useDemo();
  const [realNow, setRealNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setRealNow(Date.now()), 30_000);

    return () => window.clearInterval(timer);
  }, []);

  return demoNow(state.clockStartedAt, realNow);
}
