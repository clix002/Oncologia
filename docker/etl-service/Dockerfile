FROM docker.io/oven/bun:1

WORKDIR /app

COPY package.json ./
RUN bun install

COPY tsconfig.json ./
COPY scripts/ ./scripts/

CMD ["bun", "run", "all"]
