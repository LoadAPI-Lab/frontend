import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/select';

import {
    isLoadPresetId,
    LOAD_PRESET_IDS,
    LOAD_PRESETS,
    type LoadPresetId,
    type PresetChoice,
} from './load-presets';

export interface PresetSelectProps {
    value: PresetChoice;
    onSelect: (preset: LoadPresetId) => void;
    disabled?: boolean;
}

export function PresetSelect({ value, onSelect, disabled = false }: PresetSelectProps) {
    const { t } = useTranslation();
    const items = [
        ...LOAD_PRESET_IDS.map((id) => ({ value: id, label: t(`testConfig.presets.${id}`) })),
        { value: 'custom', label: t('testConfig.presets.custom') },
    ];

    return (
        <Select.Root
            items={items}
            value={value}
            disabled={disabled}
            onValueChange={(next) => {
                if (isLoadPresetId(next)) {
                    onSelect(next);
                }
            }}
        >
            <Select.Trigger
                aria-label={t('testConfig.preset')}
                className="w-fit min-w-34 disabled:opacity-50"
            >
                <span className="flex items-center gap-2.25">
                    <span
                        aria-hidden
                        className="text-label text-fg-muted"
                    >
                        {t('testConfig.preset')}
                    </span>
                    <Select.Value className="text-md text-fg font-bold" />
                </span>
            </Select.Trigger>
            <Select.Popup alignItemWithTrigger={false}>
                {LOAD_PRESET_IDS.map((id) => (
                    <Select.Item
                        key={id}
                        value={id}
                    >
                        <span className="flex w-full items-baseline justify-between gap-4">
                            {t(`testConfig.presets.${id}`)}
                            <span className="text-label text-fg-muted font-mono tabular-nums">
                                {t('testConfig.presetSummary', LOAD_PRESETS[id])}
                            </span>
                        </span>
                    </Select.Item>
                ))}
                <Select.Item
                    value="custom"
                    disabled
                >
                    {t('testConfig.presets.custom')}
                </Select.Item>
            </Select.Popup>
        </Select.Root>
    );
}
