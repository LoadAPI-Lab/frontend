# ---- build ----
# The output is static files, so build once on the runner's native platform
# (no emulation) and reuse it for every target platform.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@11

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm routes:generate && pnpm build

# ---- runtime: static files on unprivileged nginx (port 8080) ----
FROM nginxinc/nginx-unprivileged:stable-alpine

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY docker/nginx/api.conf.template /etc/nginx/snippets/api.conf.template
COPY --chmod=0755 docker/entrypoint.sh /docker-entrypoint.d/40-loadapi.sh
COPY --from=build /app/dist /usr/share/nginx/html

# Runtime config (all optional):
#   API_UPSTREAM     e.g. http://core:3000 -> this container proxies /api itself.
#                    Leave empty when a shared reverse proxy already routes /api to core.
#   API_MOCKING      true -> run on MSW mocks, no backend needed
#   FEATURE_BATCH, FEATURE_ROUND_ROBIN
ENV API_UPSTREAM="" \
    NGINX_RESOLVER="127.0.0.11"

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
