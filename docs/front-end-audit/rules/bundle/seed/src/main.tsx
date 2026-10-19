import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

// bundle-preload: no defaultPreload. bundle-defer-third-party: tracking call on startup.
export const router = createRouter({ routeTree });
declare const gtag: (...args: unknown[]) => void;
gtag("config", "G-SEED");
