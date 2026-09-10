FROM oven/bun:latest AS base

WORKDIR /app

FROM base AS install

COPY package.json bun.lockb* ./
COPY packages/db/package.json ./packages/db/
COPY apps/dashboard/package.json ./apps/dashboard/

RUN bun install

FROM base AS build

COPY --from=install /app/node_modules ./node_modules
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

COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/apps/dashboard ./apps/dashboard
COPY --from=build /app/apps/dashboard/.next ./apps/dashboard/.next
COPY package.json bun.lock* ./
COPY turbo.json ./

EXPOSE 3000

CMD ["bun", "run", "--filter", "dashboard", "start"]
