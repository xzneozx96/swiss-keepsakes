// Known violations, one per rule, to prove each detector fires. Not part of the app.
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Tooltip } from "recharts";

declare function buildSearchIndex(items: string[]): Map<string, number>;
declare function post(url: string): void;
declare function useDemo(): { state: { data: { orders: string[] } }; update: (r: (s: unknown) => unknown) => void };
declare function useDemoSelector<T>(select: (s: { data: { orders: string[] } }) => T): T;
declare function useWindowWidth(): number;
declare function fuzzyMatch(item: string, q: string): boolean;
declare function useTours(): { data: unknown; tours: string[]; now: Date; role: string };
declare function useChat(options: { chat: unknown }): unknown;

const Ctx = createContext<{ a: number } | null>(null);

// SEED rerender-no-inline-components
export function SeedInline({ user }: { user: { name: string } }) {
  const Avatar = () => <span>{user.name}</span>;
  function Stats() {
    return <b>{user.name}</b>;
  }

  return (
    <div>
      <Avatar />
      <Stats />
    </div>
  );
}

// SEED rerender-lazy-state-init
export function SeedLazy({ items }: { items: string[] }) {
  const [index] = useState(buildSearchIndex(items));
  const [settings] = useState(JSON.parse(localStorage.getItem("s") || "{}"));

  return <p>{index.size + Object.keys(settings).length}</p>;
}

// SEED rerender-functional-setstate
export function SeedFunctional() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<string[]>([]);

  return (
    <button
      onClick={() => {
        setCount(count + 1);
        setTimeout(() => setItems([...items, "x"]), 10);
      }}
    >
      {count}
    </button>
  );
}

// SEED rerender-move-effect-to-event
export function SeedEffectEvent() {
  const [submitted, setSubmitted] = useState(false);
  const theme = useContext(Ctx);

  useEffect(() => {
    if (submitted) {
      post("/api/register");
    }
  }, [submitted, theme]);

  return <button onClick={() => setSubmitted(true)}>Submit</button>;
}

// SEED rerender-derived-state-no-effect
export function SeedDerived({ first, last }: { first: string; last: string }) {
  const [full, setFull] = useState("");

  useEffect(() => {
    setFull(first + " " + last);
  }, [first, last]);

  return <p>{full}</p>;
}

// SEED rerender-simple-expression-in-memo
export function SeedSimpleMemo({ a, b }: { a: { loading: boolean }; b: { loading: boolean } }) {
  const isLoading = useMemo(() => a.loading || b.loading, [a.loading, b.loading]);

  return <p>{String(isLoading)}</p>;
}

// SEED rerender-memo-with-default-value
export const SeedDefault = memo(function SeedDefault({
  tags = [],
  onClick = () => {},
}: {
  tags?: string[];
  onClick?: () => void;
}) {
  return <button onClick={onClick}>{tags.length}</button>;
});

// SEED rerender-defer-reads
export function SeedDeferReads({ id }: { id: string }) {
  const orders = useDemoSelector((s) => s.data.orders);
  const { update } = useDemo();

  const handleShare = () => {
    post(id + orders.join(","));
  };

  return (
    <button onClick={handleShare} onDoubleClick={() => update((s) => s)}>
      Share
    </button>
  );
}

// SEED rerender-derived-state
export function SeedSubscribeDerived() {
  const width = useWindowWidth();
  const orders = useDemoSelector((s) => s.data.orders);
  const isMobile = width < 768;

  return <nav className={isMobile ? "m" : "d"}>{orders.length > 0 ? "yes" : "no"}</nav>;
}

// SEED rerender-dependencies
export function SeedDeps({ user }: { user: { id: string; name: string } }) {
  useEffect(() => {
    post(user.id);
  }, [user]);

  return null;
}

// SEED rerender-split-combined-hooks
export function SeedSplit({
  products,
  category,
  sortOrder,
  pathname,
  pageTitle,
}: {
  products: { category: string; price: number }[];
  category: string;
  sortOrder: string;
  pathname: string;
  pageTitle: string;
}) {
  const sorted = useMemo(() => {
    const filtered = products.filter((p) => p.category === category);
    const out = filtered.toSorted((a, b) => (sortOrder === "asc" ? a.price - b.price : b.price - a.price));

    return out;
  }, [products, category, sortOrder]);

  useEffect(() => {
    post(pathname);
    document.title = `${pageTitle} | App`;
  }, [pathname, pageTitle]);

  return <p>{sorted.length}</p>;
}

// SEED rerender-memo
export function SeedMemo({ items, loading }: { items: string[]; loading: boolean }) {
  const expensive = useMemo(() => items.map((i) => i.toUpperCase()).toSorted(), [items]);

  if (loading) return <p>loading</p>;

  return <p>{expensive.join()}</p>;
}

// SEED rerender-transitions + rerender-use-ref-transient-values
export function SeedScroll() {
  const [scrollY, setScrollY] = useState(0);
  const [lastX, setLastX] = useState(0);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    const onMove = (e: MouseEvent) => setLastX(e.clientX);

    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("mousemove", onMove);

    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <div style={{ left: lastX, top: scrollY }} />;
}

// SEED rerender-use-deferred-value
export function SeedSearch({ items }: { items: string[] }) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) => fuzzyMatch(item, query));

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {filtered.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </>
  );
}

// SEED jsx-no-constructed-context-values
export function SeedProvider({ children }: { children: React.ReactNode }) {
  const [a] = useState(1);

  return <Ctx.Provider value={{ a }}>{children}</Ctx.Provider>;
}

// SEED rerender-no-inline-components (recharts mounts Tooltip.content with createElement)
export function SeedChart({ label }: { label: string }) {
  const tooltip = () => <div>{label}</div>;

  return <Tooltip content={tooltip} />;
}

// SEED rerender-derived-state (useTours read for one field)
export function SeedTours() {
  const { role } = useTours();

  return <p>{role}</p>;
}

// SEED rerender-transitions (streamed chunks without experimental_throttle)
export function SeedChat() {
  useChat({ chat: null });

  return null;
}

// keep imports used
export const _keep = useSyncExternalStore;
