// bundle-analyzable-paths: the bundler cannot see these paths.
const PAGES: Record<string, string> = { home: "./pages/home", settings: "./pages/settings" };

export const loadPage = (name: string) => import(PAGES[name]);
export const imageUrl = (name: string) => new URL(`./img/${name}.png`, import.meta.url);
export const allPages = import.meta.glob("./pages/*.ts", { eager: true });
