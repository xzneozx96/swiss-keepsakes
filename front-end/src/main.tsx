import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import {
  LocaleProvider,
  loadDictionary,
  storedLanguage,
} from "@/contexts/locale-context";
import { DemoProvider } from "@/features/demo";
import { routeTree } from "@/routeTree.gen";
import "@/styles/globals.css";

// Hash history: the prototype is served as static files with no server rewrites,
// so deep links and reloads (e.g. #/merchant/orders) must not hit the server.
const router = createRouter({
  routeTree,
  history: createHashHistory(),
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
  interface StaticDataRouteOption {
    /** Detail screens with their own bottom action bar hide the guest tab bar (native pattern). */
    hideTabBar?: boolean;
    /** The screen reserves room for its own bottom bar; the guest shell adds no bottom padding. */
    ownsBottomSpace?: boolean;
  }
}

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  // Whoever saved German waits for its chunk before the first paint; everyone else already has English.
  // If German cannot be fetched the app still starts, in English.
  void loadDictionary(storedLanguage())
    .catch(() => undefined)
    .then(() => {
      ReactDOM.createRoot(rootElement).render(
        <StrictMode>
          <LocaleProvider>
            <DemoProvider>
              <RouterProvider router={router} />
            </DemoProvider>
          </LocaleProvider>
        </StrictMode>,
      );
    });
}
