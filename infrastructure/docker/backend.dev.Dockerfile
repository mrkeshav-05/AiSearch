FROM node:18-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy package manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install ALL dependencies (including devDependencies for nodemon / ts-node)
RUN pnpm install --frozen-lockfile

# Copy backend config files (src/ is mounted as a volume for hot-reload)
COPY backend/tsconfig.json ./backend/
COPY backend/nodemon.json ./backend/

# Copy shared source and pre-build it (needed for type imports)
COPY shared ./shared/
RUN pnpm --filter @aisearch/shared run build

EXPOSE 8000

# Source is mounted via volume at runtime; nodemon watches for changes
CMD ["pnpm", "--filter", "@aisearch/backend", "run", "dev"]
