FROM node:18-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy package manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

# Install ALL dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy frontend config files (src/ and public/ are mounted as volumes for hot-reload)
COPY frontend/tsconfig.json ./frontend/
COPY frontend/next.config.ts ./frontend/
COPY frontend/postcss.config.mjs ./frontend/
COPY frontend/components.json ./frontend/
COPY frontend/eslint.config.mjs ./frontend/

# Copy shared source and pre-build it
COPY shared ./shared/
RUN pnpm --filter @aisearch/shared run build

EXPOSE 3000

# Source is mounted via volume at runtime; Next.js dev server watches for changes
CMD ["pnpm", "--filter", "@aisearch/frontend", "run", "dev"]
