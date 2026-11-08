import { z } from 'zod';

const KEY = 'routelab.tests.last';

export const testsSearchSchema = z.object({
    spec: z.string().optional(),
    endpoint: z.string().optional(),
    run: z.string().optional(),
});

export type TestsSearch = z.infer<typeof testsSearchSchema>;

export function rememberTestsSearch(search: TestsSearch) {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(search));
    } catch {
        return;
    }
}

export function lastTestsSearch(): TestsSearch {
    try {
        const parsed = testsSearchSchema.safeParse(JSON.parse(sessionStorage.getItem(KEY) ?? '{}'));
        return parsed.success ? parsed.data : {};
    } catch {
        return {};
    }
}
