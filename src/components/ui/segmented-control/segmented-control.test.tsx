import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from './segmented-control';

function renderModes(onValueChange = vi.fn<(value: string) => void>()) {
    render(
        <SegmentedControl.Root
            aria-label="Test mode"
            value="single"
            onValueChange={onValueChange}
        >
            <SegmentedControl.Item value="single">Single</SegmentedControl.Item>
            <SegmentedControl.Item value="batch">Batch</SegmentedControl.Item>
        </SegmentedControl.Root>,
    );
    return onValueChange;
}

describe('SegmentedControl', () => {
    it('reports the newly picked value', async () => {
        const onValueChange = renderModes();
        await userEvent.click(screen.getByRole('button', { name: 'Batch' }));
        expect(onValueChange).toHaveBeenCalledWith('batch');
    });

    it('never lets the active item be pressed off', async () => {
        const onValueChange = renderModes();
        await userEvent.click(screen.getByRole('button', { name: 'Single' }));
        expect(onValueChange).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Single' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });
});
