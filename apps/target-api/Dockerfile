FROM oven/bun:latest AS base

WORKDIR /app

FROM base AS install

COPY package.json bun.lock* ./
COPY packages/db/package.json ./packages/db/
COPY apps/target-api/package.json ./apps/target-api/

RUN bun install

FROM base AS build

COPY --from=install /app/node_modules ./node_modules
COPY . .

RUN bun run build --filter target-api...

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/apps/target-api ./apps/target-api
COPY package.json bun.lock* ./
COPY turbo.json ./

EXPOSE 4000

CMD ["bun", "run", "--filter", "target-api", "start"]
