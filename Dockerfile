FROM node:22-alpine3.23@sha256:8516dce0483394d5708d4b2ee6cacb79fb1d617ea4e2787c2120bcca92ce372e AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine3.23@sha256:8516dce0483394d5708d4b2ee6cacb79fb1d617ea4e2787c2120bcca92ce372e AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine3.23@sha256:8516dce0483394d5708d4b2ee6cacb79fb1d617ea4e2787c2120bcca92ce372e AS runner

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN apk add --no-cache curl \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx \
    && addgroup --system --gid 10001 nextjs \
    && adduser --system --uid 10001 --ingroup nextjs nextjs \
    && mkdir -p /app/.next/cache \
    && chown -R nextjs:nextjs /app

COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER 10001:10001
EXPOSE 3000
CMD ["node", "server.js"]
