// Driver-only dev server (2.17, coordinator option A, 14 Oct 2026). The client-demo build hides
// every prototype demo control in src/features/demo/components/prototype-bar.tsx (commented
// out on purpose). Drivers that press those controls run against this config instead: it
// restores them in memory while Vite serves the file. The shared file is never written.
// No HMR, as 1.6-vite.nohmr.mjs. Run on your own port only:
//   cd front-end && npx vite --config ../docs/ux/prototype/reports/vite.test-controls.config.mjs --port <port> --strictPort
import base from "/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end/vite.config.ts";

const BAR = "/src/features/demo/components/prototype-bar.tsx";

const restoreDemoControls = {
  name: "restore-demo-controls",
  enforce: "pre",
  transform(code, id) {
    if (!id.split("?")[0].endsWith(BAR)) return null;
    const out = code
      // Line 12 holds the original import; line 13 is the client-demo replacement.
      .replace(
        '// import { Link, useNavigate } from "@tanstack/react-router";\nimport { useNavigate } from "@tanstack/react-router";',
        'import { Link, useNavigate } from "@tanstack/react-router";',
      )
      .replace(/^\/\/ (import .*)$/gm, "$1")
      .replace(/\{\/\* Hidden for the client demo:[^\n]*\n/, "")
      .replace(/\n\s*\*\/\}\n/, "\n");
    // Fail loudly if the hidden block changed shape, rather than serve a half-restored bar.
    if (/\/\/ import|Hidden for the client demo|\*\/\}/.test(out))
      throw new Error("vite.test-controls: prototype-bar.tsx no longer matches; update the transform");
    return out;
  },
};

export default {
  ...base,
  root: "/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end",
  server: { ...(base.server ?? {}), hmr: false },
  plugins: [restoreDemoControls, ...(base.plugins ?? [])],
};
