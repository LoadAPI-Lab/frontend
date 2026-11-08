const PATH_PARAM_RE = /^(?::\w+|\{\w+\})$/;

export function unresolvedPathParam(url: string): string | undefined {
    const path = url.replace(/#.*$/, '').replace(/\?.*$/, '');
    return path.split('/').find((segment) => PATH_PARAM_RE.test(segment));
}
