FROM oven/bun:latest AS base

WORKDIR /app

FROM base AS install

COPY package.json bun.lock* turbo.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY apps/target-api/package.json ./apps/target-api/

RUN bun install

FROM base AS build

COPY --from=install /app ./
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bun run build --filter dashboard...

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app ./

EXPOSE 3000

CMD ["bun", "run", "--filter", "dashboard", "start"]
