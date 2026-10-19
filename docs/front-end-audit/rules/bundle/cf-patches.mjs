// In-memory source patches for counterfactual builds (build-graph.mjs <out> <variant>).
// Each patch is the smallest change that tests one hypothesis; none is a proposed final fix.
const swap = (from, to) => (src) => {
  if (!src.includes(from)) throw new Error(`patch target not found: ${from.slice(0, 60)}`);

  return src.replace(from, to);
};
const chain =
  (...fns) =>
  (src) =>
    fns.reduce((s, f) => f(s), src);

// Route files whose validateSearch reads a constant from a hook or component module:
// inline the constant so the reference file stops importing that module.
const routeLeaks = {
  "src/routes/_guest/account_.orders.$orderId.tsx": swap(
    "  orderTabs,\n} from \"@/features/transactions/order-detail/components/order-detail\";",
    '} from "@/features/transactions/order-detail/components/order-detail";\nconst orderTabs = ["overview", "payments", "timeline", "policy"] as const;',
  ),
  "src/routes/store/reports/costs.tsx": swap(
    'import { COST_FILTERS } from "@/features/reports/hooks/use-cost-data";',
    'const COST_FILTERS = ["missing", "complete", "all"] as const;',
  ),
  "src/routes/store/partners/index.tsx": swap(
    'import { PARTNER_FILTERS } from "@/features/merchant/partners/hooks/use-merchant-partners";',
    'const PARTNER_FILTERS = ["toPay", "revoked", "archived"] as const;',
  ),
  "src/routes/lab.blog-home_.stories.tsx": swap(
    'import { categories } from "@/features/lab/blog-home/data";',
    'const categories: CategoryFilter[] = ["all", "eat", "town", "lake", "craft"];',
  ),
};

// The lab map route's side-effect CSS import stays in the route reference file (main bundle).
const maplibreCss = {
  "src/routes/lab.map.tsx": swap('import "maplibre-gl/dist/maplibre-gl.css";\n', ""),
};

// icons.ts: tell the bundler each top-level stable(...) call is pure, so unused exports can go.
const iconsPure = {
  "src/components/icons.ts": (src) => src.replaceAll("= stable(", "= /*#__PURE__*/ stable("),
};

// icons.ts as a pure re-export barrel (drops the memo wrapper; bundle measurement only):
// each reicon module can then land in the chunk that uses it.
const iconsReexport = {
  "src/components/icons.ts": (src) =>
    src
      .replace(/export const (\w+) = stable\(\s*Reicon\.(\w+),\s*"\w+",?\s*\);/g, 'export { $2 as $1 } from "reicon-react";')
      .replace('import * as Reicon from "reicon-react";\n', "")
      .replace(/function stable[\s\S]*?\n}\n/, ""),
};

// The prototype bar renders a QR code only after the drawer opens and a partner is picked.
const qrLazy = {
  "src/features/demo/components/prototype-bar.tsx": chain(
    swap(
      'import { QRCodeSVG } from "qrcode.react";',
      'const QRCodeSVG = lazy(() => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })));',
    ),
    swap('import { useState } from "react";', 'import { lazy, useState } from "react";'),
  ),
};

// The English dictionary without the six merchant/partner message files it spreads in
// (lower bound: merchant keys written inline in en.ts stay).
const merchantMsgs = {
  "src/i18n/en.ts": (src) =>
    src.replace(/^ {2}\.\.\.(tourMerchantEn|contentMerchantEn|partnerDashboardEn|productsEn|salesOverviewEn|reportPagesEn),\n/gm, ""),
};

// What React Aria's locale-trimming plugin would do: keep only en-US and de-DE strings.
const KEEP = /(en-US|de-DE)\.mjs/;
const ariaLocales = {
  "re:/node_modules/react-aria/dist/private/[^/]+/intlStrings\\.mjs$": (src) =>
    src
      .split("\n")
      .filter((l) => !(/^import .* from "\.\.\/intl\/[^"]+\.mjs";$/.test(l) && !KEEP.test(l)))
      .filter((l) => !(/^ {4}"[a-z]{2}-[A-Z]{2}": \$/.test(l) && !/"(en-US|de-DE)"/.test(l)))
      .join("\n"),
};

export default {
  baseline: {},
  merchantMsgs,
  ariaLocales,
  routeLeaks,
  orders: { "src/routes/_guest/account_.orders.$orderId.tsx": routeLeaks["src/routes/_guest/account_.orders.$orderId.tsx"] },
  maplibreCss,
  iconsPure,
  iconsReexport,
  qrLazy,
  all: { ...routeLeaks, ...maplibreCss, ...iconsReexport, ...qrLazy },
  allPlus: { ...routeLeaks, ...maplibreCss, ...iconsReexport, ...qrLazy, ...merchantMsgs, ...ariaLocales },
};
