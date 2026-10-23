FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 APP_MODE=production
RUN npm run build

FROM dependencies AS worker
ENV NODE_ENV=production
RUN npm prune --omit=dev
COPY --chown=node:node lib ./lib
COPY --chown=node:node scripts/reward-worker.mjs ./scripts/reward-worker.mjs
USER node
CMD ["node", "scripts/reward-worker.mjs"]

FROM node:22-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]

