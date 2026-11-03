import type { Meta, StoryObj } from '@storybook/react-vite';

// Design tokens from src/app/styles/theme.css (Figma "LoadAPI (Copy)", frame 5:293).
// Keep these lists in sync with theme.css when a token is added or renamed.

const colorGroups = [
    {
        title: 'Surfaces',
        tokens: [
            ['bg', 'page background'],
            ['surface-1', 'cards'],
            ['surface-input', 'inputs, config fields'],
            ['surface-raised', 'active top-bar tab'],
            ['surface-selected', 'selected route'],
            ['surface-code', 'body editor'],
            ['surface-2', 'chips, tabs, badges'],
            ['track', 'progress track'],
        ],
    },
    {
        title: 'Borders',
        tokens: [
            ['border', 'cards'],
            ['border-strong', 'inputs, buttons, tabs'],
            ['border-subtle', 'dividers'],
        ],
    },
    {
        title: 'Text',
        tokens: [
            ['fg', 'primary text, numbers'],
            ['fg-secondary', 'route paths'],
            ['fg-muted', 'nav, folders, timer'],
            ['fg-subtle', 'labels, units (3.4:1, large text only)'],
            ['fg-faint', 'counts'],
            ['fg-disabled', 'line numbers'],
            ['fg-badge', 'collection initials'],
        ],
    },
    {
        title: 'Accent and status',
        tokens: [
            ['accent', 'logo, POST, RUNNING, progress'],
            ['accent-fg', 'text on accent'],
            ['info', 'GET, p95, 4xx'],
            ['warning', 'PATCH'],
            ['danger', 'DELETE, errors, 5xx, Stop'],
        ],
    },
    {
        title: 'HTTP methods',
        tokens: [
            ['method-get', 'GET'],
            ['method-post', 'POST'],
            ['method-put', 'PUT (placeholder)'],
            ['method-patch', 'PATCH'],
            ['method-delete', 'DELETE'],
            ['method-other', 'HEAD, OPTIONS'],
        ],
    },
] as const;

const textSizes = [
    ['2xs', '9.5px'],
    ['xs', '10px'],
    ['sm', '10.5px'],
    ['label', '11px'],
    ['base', '11.5px'],
    ['control', '12px'],
    ['md', '12.5px'],
    ['lg', '14px'],
    ['xl', '17px'],
    ['2xl', '21px'],
] as const;

const radii = [
    ['xs', '3px'],
    ['sm', '5px'],
    ['md', '6px'],
    ['lg', '8px'],
    ['editor', '9px'],
    ['card', '12px'],
] as const;

function Swatch({ name, use }: { name: string; use: string }) {
    return (
        <li className="flex items-center gap-3">
            <span
                aria-hidden
                className="border-border-strong size-9 shrink-0 rounded-lg border"
                style={{ background: `var(--color-${name})` }}
            />
            <span className="flex flex-col">
                <code className="text-fg font-mono text-base">{name}</code>
                <span className="text-fg-muted text-sm">{use}</span>
            </span>
        </li>
    );
}

function Tokens() {
    return (
        <div className="flex max-w-5xl flex-col gap-8">
            {colorGroups.map((group) => (
                <section key={group.title}>
                    <h2 className="text-fg mb-3 text-lg font-semibold">{group.title}</h2>
                    <ul className="grid grid-cols-3 gap-4">
                        {group.tokens.map(([name, use]) => (
                            <Swatch
                                key={name}
                                name={name}
                                use={use}
                            />
                        ))}
                    </ul>
                </section>
            ))}

            <section>
                <h2 className="text-fg mb-3 text-lg font-semibold">Type scale</h2>
                <ul className="flex flex-col gap-2">
                    {textSizes.map(([name, px]) => (
                        <li
                            key={name}
                            className="flex items-baseline gap-4"
                        >
                            <code className="text-fg-muted w-24 font-mono text-sm">
                                text-{name} · {px}
                            </code>
                            <span
                                className="text-fg"
                                style={{ fontSize: `var(--text-${name})` }}
                            >
                                Inter · 297.4 RPS
                            </span>
                            <span
                                className="text-fg font-mono tabular-nums"
                                style={{ fontSize: `var(--text-${name})` }}
                            >
                                JetBrains Mono · /api/tasks
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h2 className="text-fg mb-3 text-lg font-semibold">Radii</h2>
                <ul className="flex gap-4">
                    {radii.map(([name, px]) => (
                        <li
                            key={name}
                            className="flex flex-col items-center gap-2"
                        >
                            <span
                                aria-hidden
                                className="bg-surface-2 border-border-strong size-14 border"
                                style={{ borderRadius: `var(--radius-${name})` }}
                            />
                            <code className="text-fg-muted font-mono text-sm">
                                {name} · {px}
                            </code>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

const meta = {
    title: 'Foundations/Tokens',
    component: Tokens,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Tokens>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {};
