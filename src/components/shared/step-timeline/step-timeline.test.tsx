import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StepTimeline, timelineTicks } from './step-timeline';

describe('timelineTicks', () => {
    it('picks round steps that cover the total', () => {
        expect(timelineTicks(142)).toEqual([0, 25, 50, 75, 100, 125, 150]);
        expect(timelineTicks(100)).toEqual([0, 20, 40, 60, 80, 100]);
        expect(timelineTicks(9)).toEqual([0, 2, 4, 6, 8, 10]);
        expect(timelineTicks(2400)).toEqual([0, 500, 1000, 1500, 2000, 2500]);
    });

    it('falls back to a single tick without time', () => {
        expect(timelineTicks(0)).toEqual([0]);
        expect(timelineTicks(Number.NaN)).toEqual([0]);
    });
});

describe('StepTimeline', () => {
    it('lists each step and draws bars only for steps that ran', () => {
        const { container } = render(
            <StepTimeline
                aria-label="Steps"
                formatTick={(value, last) => (last ? `${value}ms` : String(value))}
                formatDuration={(ms) => `${ms}ms`}
                steps={[
                    {
                        key: 'a',
                        number: '01',
                        method: 'POST',
                        path: '/tasks',
                        status: 'ok',
                        outcome: '201',
                        startMs: 0,
                        durationMs: 38,
                    },
                    {
                        key: 'b',
                        number: '02',
                        method: 'GET',
                        path: '/tasks/1',
                        status: 'skipped',
                        outcome: 'SKIPPED',
                        startMs: 38,
                    },
                ]}
            />,
        );
        const items = within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem');
        expect(items).toHaveLength(2);
        expect(items[0]).toHaveTextContent('01POST/tasks20138ms');
        expect(items[1]).toHaveTextContent('02GET/tasks/1SKIPPED—');
        expect(container.querySelectorAll('[data-bar]')).toHaveLength(1);
        expect(screen.getByText('40ms')).toBeInTheDocument();
    });
});
