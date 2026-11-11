import { describe, expect, it } from 'vitest';

import { readSpecFile } from './spec-file';

describe('readSpecFile', () => {
    it.each(['api.json', 'api.yaml', 'API.YML'])('reads %s', async (name) => {
        await expect(readSpecFile(new File(['openapi: 3.1.0'], name))).resolves.toEqual({
            kind: 'loaded',
            content: 'openapi: 3.1.0',
        });
    });

    it('drops a byte order mark', async () => {
        await expect(readSpecFile(new File(['\uFEFF{}'], 'api.json'))).resolves.toEqual({
            kind: 'loaded',
            content: '{}',
        });
    });

    it('rejects other file types', async () => {
        await expect(readSpecFile(new File(['x'], 'notes.txt'))).resolves.toEqual({
            kind: 'wrongType',
        });
    });

    it('rejects files over 5 MB without reading them', async () => {
        const file = new File(['x'], 'big.yaml');
        Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 + 1 });
        await expect(readSpecFile(file)).resolves.toEqual({ kind: 'tooLarge' });
    });
});
