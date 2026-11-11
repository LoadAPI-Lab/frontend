import { MAX_SPEC_BYTES } from './import-spec';

export const SPEC_FILE_ACCEPT = '.json,.yaml,.yml,application/json,application/yaml';

const SPEC_FILE_NAME = /\.(?:json|ya?ml)$/i;

export type SpecFileResult =
    | { kind: 'loaded'; content: string }
    | { kind: 'wrongType' }
    | { kind: 'tooLarge' }
    | { kind: 'unreadable' };

export async function readSpecFile(file: File): Promise<SpecFileResult> {
    if (!SPEC_FILE_NAME.test(file.name)) {
        return { kind: 'wrongType' };
    }
    if (file.size > MAX_SPEC_BYTES) {
        return { kind: 'tooLarge' };
    }
    try {
        const content = await file.text();
        return { kind: 'loaded', content: content.replace(/^\uFEFF/, '') };
    } catch {
        return { kind: 'unreadable' };
    }
}
