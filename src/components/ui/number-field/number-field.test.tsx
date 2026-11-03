import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Field } from '@/components/ui/field';

import { NumberField } from './number-field';

describe('NumberField', () => {
    it('links the inline label to the input and hides the unit suffix from assistive tech', () => {
        render(
            <Field.Root>
                <NumberField.Root defaultValue={60}>
                    <NumberField.Group>
                        <NumberField.InlineLabel>Duration (seconds)</NumberField.InlineLabel>
                        <NumberField.Input />
                        <NumberField.Suffix>s</NumberField.Suffix>
                    </NumberField.Group>
                </NumberField.Root>
            </Field.Root>,
        );
        expect(screen.getByRole('textbox', { name: 'Duration (seconds)' })).toHaveValue('60');
        expect(screen.getByText('s')).toHaveAttribute('aria-hidden', 'true');
    });
});
