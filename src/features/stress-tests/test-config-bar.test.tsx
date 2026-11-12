import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { DEFAULT_CONFIG, type TestConfig, validateConfig } from './test-config';
import { TestConfigBar } from './test-config-bar';

function Controlled({ initial }: { initial: TestConfig }) {
    const [config, setConfig] = useState(initial);
    return (
        <TestConfigBar
            config={config}
            onConfigChange={setConfig}
            issues={validateConfig(config)}
            block={null}
            phase="idle"
            onStart={() => {}}
            onStop={() => {}}
        />
    );
}

describe('TestConfigBar presets', () => {
    it('fills the inputs from a preset picked with the keyboard', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Controlled initial={DEFAULT_CONFIG} />);
        const preset = screen.getByRole('combobox', { name: 'Preset' });
        expect(preset).toHaveTextContent('Custom');

        preset.focus();
        await user.keyboard('{Enter}');
        await user.click(await screen.findByRole('option', { name: /Load/ }));

        expect(screen.getByRole('textbox', { name: 'Target RPS' })).toHaveValue('50');
        expect(screen.getByRole('textbox', { name: /^Duration/ })).toHaveValue('120');
        expect(screen.getByRole('textbox', { name: /^Ramp-up/ })).toHaveValue('30');
        expect(preset).toHaveTextContent('Load');
        expect(screen.getByText('≈ 5,250 requests')).toBeVisible();
    });

    it('switches to Custom once an input is edited', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <Controlled initial={{ targetRps: 200, durationSeconds: 60, rampUpSeconds: 0 }} />,
        );
        const preset = screen.getByRole('combobox', { name: 'Preset' });
        expect(preset).toHaveTextContent('Spike');
        expect(screen.getByText('≈ 12,000 requests')).toBeVisible();

        const rps = screen.getByRole('textbox', { name: 'Target RPS' });
        await user.clear(rps);
        await user.type(rps, '75');

        expect(preset).toHaveTextContent('Custom');
        expect(screen.getByText('≈ 4,500 requests')).toBeVisible();
    });

    it('hides the estimate while a value is invalid', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Controlled initial={DEFAULT_CONFIG} />);
        const rps = screen.getByRole('textbox', { name: 'Target RPS' });
        await user.clear(rps);
        expect(screen.queryByText(/requests$/)).not.toBeInTheDocument();
    });
});
