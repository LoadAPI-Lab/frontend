import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { StepTimeline, type StepTimelineStep } from './step-timeline';

const create: StepTimelineStep = {
    key: '1',
    number: '01',
    method: 'POST',
    path: '/api/tasks',
    status: 'ok',
    outcome: '201',
    startMs: 0,
    durationMs: 38,
};

const read: StepTimelineStep = {
    key: '2',
    number: '02',
    method: 'GET',
    path: '/api/tasks/a83f2c91',
    status: 'ok',
    outcome: '200',
    startMs: 38,
    durationMs: 21,
};

const update: StepTimelineStep = {
    key: '3',
    number: '03',
    method: 'PATCH',
    path: '/api/tasks/a83f2c91',
    status: 'failed',
    outcome: '500',
    startMs: 59,
    durationMs: 47,
};

const remove: StepTimelineStep = {
    key: '4',
    number: '04',
    method: 'DELETE',
    path: '/api/tasks/a83f2c91',
    status: 'ok',
    outcome: '204',
    startMs: 106,
    durationMs: 30,
};

const steps = [create, read, update, remove];

const meta = {
    title: 'shared/StepTimeline',
    component: StepTimeline,
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/oqsJDQ4p2kQzIheXlVJDFO/LoadAPI--Copy-?node-id=5-2629',
        },
    },
    args: {
        'aria-label': 'Step timeline',
        steps,
        formatTick: (value: number, last: boolean) => (last ? `${value}ms` : String(value)),
        formatDuration: (ms: number) => `${ms}ms`,
    },
    decorators: [
        (Story) => (
            <div className="bg-surface-1 w-200 p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof StepTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFailure: Story = {
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelectorAll('[data-bar]')).toHaveLength(4);
    },
};

export const Skipped: Story = {
    args: {
        steps: [
            { ...create, status: 'failed', outcome: '—', durationMs: 5003 },
            {
                key: read.key,
                number: read.number,
                method: read.method,
                path: read.path,
                status: 'skipped',
                outcome: 'SKIPPED',
                startMs: 5003,
            },
        ],
    },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelectorAll('[data-bar]')).toHaveLength(1);
    },
};

export const LongPath: Story = {
    args: {
        steps: [
            {
                ...create,
                path: '/api/organisations/{{orgId}}/projects/{{projectId}}/tasks?include=comments,attachments',
            },
        ],
    },
};
