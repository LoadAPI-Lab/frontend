const generated = ['src/api/generated/', 'src/routeTree.gen.ts', 'public/mockServiceWorker.js'];

const quote = (files) => files.map((file) => JSON.stringify(file)).join(' ');

export default {
    '*.{ts,tsx,js,mjs}': (files) => {
        const own = files.filter((file) => !generated.some((path) => file.includes(path)));
        if (own.length === 0) {
            return [];
        }
        return [`oxfmt ${quote(own)}`, `oxlint --fix --no-error-on-unmatched-pattern ${quote(own)}`];
    },
};
