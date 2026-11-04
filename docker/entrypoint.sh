#!/bin/sh
set -eu

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

if [ -n "${API_UPSTREAM:-}" ]; then
    envsubst '${API_UPSTREAM} ${NGINX_RESOLVER}' < /etc/nginx/snippets/api.conf.template > /tmp/nginx-api.conf
    echo "loadapi: proxying /v1 -> ${API_UPSTREAM}"
else
    : > /tmp/nginx-api.conf
fi
