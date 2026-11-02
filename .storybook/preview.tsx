import '../src/app/styles/globals.css';
import '../src/app/i18n';
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
    parameters: {
        layout: 'centered',
        // fail story tests on accessibility violations
        a11y: { test: 'error' },
    },
    decorators: [
        (Story) => (
            <div className="bg-bg text-fg p-6">
                <Story />
            </div>
        ),
    ],
};

export default preview;
