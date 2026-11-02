/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE?: string;
    readonly VITE_API_MOCKING?: string;
    readonly VITE_FEATURE_BATCH?: string;
    readonly VITE_FEATURE_ROUND_ROBIN?: string;
    readonly VITE_AUTH_BYPASS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
