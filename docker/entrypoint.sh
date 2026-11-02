#!/bin/sh
# Runs before nginx starts (official image runs /docker-entrypoint.d/*.sh).
set -eu

# 1. runtime config for the SPA
{
    printf 'window.__ENV__ = {'
    for name in API_BASE API_MOCKING FEATURE_BATCH FEATURE_ROUND_ROBIN; do
        value=$(printenv "$name" || true)
        if [ -n "$value" ]; then
            printf '"%s":"%s",' "$name" "$value"
        fi
    done
    printf '};\n'
} > /tmp/env.js

# 2. optional /api proxy
if [ -n "${API_UPSTREAM:-}" ]; then
    envsubst '${API_UPSTREAM} ${NGINX_RESOLVER}' < /etc/nginx/snippets/api.conf.template > /tmp/nginx-api.conf
    echo "loadapi: proxying /api -> ${API_UPSTREAM}"
else
    : > /tmp/nginx-api.conf
fi
