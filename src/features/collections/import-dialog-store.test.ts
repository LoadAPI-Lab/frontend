import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { openImportDialog, setImportDialogOpen, useImportDialogOpen } from './import-dialog-store';

afterEach(() => setImportDialogOpen(false));

describe('useImportDialogOpen', () => {
    it('opens from anywhere and closes through the hook', () => {
        const first = renderHook(() => useImportDialogOpen());
        const second = renderHook(() => useImportDialogOpen());
        act(() => openImportDialog());
        expect(first.result.current[0]).toBe(true);
        expect(second.result.current[0]).toBe(true);
        act(() => second.result.current[1](false));
        expect(first.result.current[0]).toBe(false);
    });
});
