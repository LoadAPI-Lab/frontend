export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

/** Tailwind text/background classes per method. The only place method colors are defined. */
const methodClasses: Record<HttpMethod, string> = {
    GET: 'text-method-get',
    POST: 'text-method-post',
    PUT: 'text-method-put',
    PATCH: 'text-method-patch',
    DELETE: 'text-method-delete',
    HEAD: 'text-method-other',
    OPTIONS: 'text-method-other',
};

export function isHttpMethod(value: string): value is HttpMethod {
    return (HTTP_METHODS as readonly string[]).includes(value);
}

export function methodColorClass(method: string): string {
    const upper = method.toUpperCase();
    return isHttpMethod(upper) ? methodClasses[upper] : 'text-method-other';
}
