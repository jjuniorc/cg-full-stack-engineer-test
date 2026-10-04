# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: build the React/Vite front-end (./front-end -> /fe/dist)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS frontend-build

WORKDIR /fe

# Install deps first for better layer caching
COPY front-end/package.json front-end/package-lock.json ./
RUN npm ci

# Copy the rest of the front-end and build (tsc -b && vite build)
COPY front-end/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: runtime - Express serves the API and the built front-end
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Back-end dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Back-end source
COPY index.js ./
COPY routes ./routes
COPY graphql ./graphql
COPY local_modules ./local_modules

# Built front-end from stage 1 -> served by express.static at the same origin
COPY --from=frontend-build /fe/dist ./front-end/dist

# index.js requires a physical .env file to exist at process.cwd().
# dotenv does NOT override already-set env vars, so docker-compose
# environment: values still win over these defaults.
COPY .env.example ./.env

EXPOSE 3001

CMD ["node", "index.js"]
