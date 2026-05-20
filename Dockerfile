# Base stage
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# --- Stage 1: Dependencies ---
FROM base AS install
# Copy package manifests
COPY package.json bun.lock ./

# Install ALL dependencies (for build stage)
RUN bun install --frozen-lockfile

# Install ONLY PRODUCTION dependencies in a separate directory
RUN mkdir -p /prod_node_modules
COPY package.json bun.lock /prod_node_modules/
RUN cd /prod_node_modules && bun install --frozen-lockfile --production

# --- Stage 2: Builder ---
FROM base AS builder
# Copy all dependencies from install stage
COPY --from=install /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN bunx prisma generate

# Build the React Router app
ENV NODE_ENV=production
RUN bun run build

# --- Stage 3: Runner (Production Image) ---
FROM base AS runner

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# 1. Copy only Production node_modules
COPY --from=install /prod_node_modules/node_modules ./node_modules

# 2. Copy the generated Prisma Client from the builder stage
# (This avoids needing to run generation in the final container)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 3. Copy Prisma CLI so migrations run instantly without re-downloading it
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# 4. Copy build artifacts and necessary runtime files
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Use the non-root 'bun' user built into the image for better security
USER bun

EXPOSE 3000

# Run pending database migrations, then start the server
# Note: We use || true or resolve to handle cases where the DB is already baselined
CMD ["sh", "-c", "bunx prisma migrate resolve --applied 20240320000000_init || true && bunx prisma migrate deploy && bun run start"]
