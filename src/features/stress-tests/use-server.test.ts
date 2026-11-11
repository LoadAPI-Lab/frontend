import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useServer } from './use-server';

const servers = [{ url: 'http://testserver:8080' }, { url: 'http://localhost:8080' }];

describe('useServer', () => {
    it("starts from the doc's first server", () => {
        const { result } = renderHook(() => useServer('spec-a', servers));
        expect(result.current[0]).toBe('http://testserver:8080');
    });

    it('keeps any typed URL per doc, also after a remount', () => {
        const first = renderHook(() => useServer('spec-a', servers));
        act(() => first.result.current[1]('http://localhost:9090'));
        expect(first.result.current[0]).toBe('http://localhost:9090');
        first.unmount();

        expect(renderHook(() => useServer('spec-a', servers)).result.current[0]).toBe(
            'http://localhost:9090',
        );
        expect(renderHook(() => useServer('spec-b', servers)).result.current[0]).toBe(
            'http://testserver:8080',
        );
    });

    it('lets the field be cleared instead of snapping back', () => {
        const { result } = renderHook(() => useServer('spec-a', servers));
        act(() => result.current[1](''));
        expect(result.current[0]).toBe('');
    });
});
