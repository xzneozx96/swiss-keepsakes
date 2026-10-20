# The API image (architecture D3). It runs the API and the worker; serving the SPA comes with its own story.
# Release command: node api/dist/platform/db/migrate.js

FROM node:22.23.3-trixie-slim@sha256:154ba2f4d6fec323d28e4f4bb86bba4677f1223391a1979cf521304e03a98dfa AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
COPY api/package.json api/
COPY packages/api-contract/package.json packages/api-contract/
COPY packages/i18n/package.json packages/i18n/
# corepack installs the pnpm version named by packageManager in package.json.
RUN corepack enable && corepack install

FROM base AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir /pnpm-store --filter "@sk/api..."
COPY api api
COPY packages/api-contract packages/api-contract
COPY packages/i18n packages/i18n
RUN pnpm --filter @sk/api build

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --prod --frozen-lockfile --store-dir /pnpm-store --filter "@sk/api..."

FROM node:22.23.3-trixie-slim@sha256:154ba2f4d6fec323d28e4f4bb86bba4677f1223391a1979cf521304e03a98dfa
WORKDIR /app
COPY --from=prod-deps /app ./
COPY --from=build /app/packages/api-contract/dist packages/api-contract/dist
COPY --from=build /app/packages/i18n/dist packages/i18n/dist
COPY --from=build /app/api/dist api/dist
COPY api/migrations api/migrations
USER node
CMD ["node", "--conditions=sk-compiled", "api/dist/main.js"]
