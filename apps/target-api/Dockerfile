FROM oven/bun:latest AS base

WORKDIR /app

FROM base AS install

COPY package.json bun.lock* turbo.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/target-api/package.json ./apps/target-api/
COPY apps/dashboard/package.json ./apps/dashboard/

RUN bun install

FROM base AS build

COPY --from=install /app ./
COPY . .

RUN bun run build --filter target-api...

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app ./

EXPOSE 4000

CMD ["bun", "run", "--filter", "target-api", "start"]
