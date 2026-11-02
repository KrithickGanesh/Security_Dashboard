# ---------------------------------------------------------------
# Production image: builds the React SPA and serves it from the
# Express API, so the whole application runs on ONE origin.
#
#   Browser -> https://<service>.onrender.com
#                /            -> React SPA (static)
#                /api/v1/*    -> Express API
#                /socket.io/* -> Socket.IO
#
# Build context: repository root.
# ---------------------------------------------------------------

# ---------- Stage 1: build the React SPA ----------
FROM node:20-alpine AS client-build

WORKDIR /client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./

# The SPA is served by Express from PUBLIC_DIR (default: <app>/public).
COPY --from=client-build /client/dist ./public

EXPOSE 5000

CMD ["node", "src/server.js"]
