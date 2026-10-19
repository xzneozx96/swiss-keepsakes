FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
ARG STEP=v2
ARG APP_VERSION=v2
ENV APP_VERSION=${APP_VERSION}
COPY server.ts migrate.ts ./
COPY drizzle/${STEP} ./drizzle
CMD ["npx", "tsx", "server.ts"]
