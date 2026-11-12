import type { TestConfig } from './test-config';

export interface LoadPreset {
    targetRps: number;
    durationSeconds: number;
    rampUpSeconds: number;
}

export const LOAD_PRESETS = {
    smoke: { targetRps: 5, durationSeconds: 30, rampUpSeconds: 0 },
    load: { targetRps: 50, durationSeconds: 120, rampUpSeconds: 30 },
    spike: { targetRps: 200, durationSeconds: 60, rampUpSeconds: 0 },
} as const satisfies Record<string, LoadPreset>;

export type LoadPresetId = keyof typeof LOAD_PRESETS;
export type PresetChoice = LoadPresetId | 'custom';

export const LOAD_PRESET_IDS: readonly LoadPresetId[] = ['smoke', 'load', 'spike'];

export function isLoadPresetId(value: unknown): value is LoadPresetId {
    return typeof value === 'string' && LOAD_PRESET_IDS.some((id) => id === value);
}

export function matchPreset(config: TestConfig): PresetChoice {
    const ramp = config.rampUpSeconds ?? 0;
    const match = LOAD_PRESET_IDS.find((id) => {
        const preset = LOAD_PRESETS[id];
        return (
            preset.targetRps === config.targetRps &&
            preset.durationSeconds === config.durationSeconds &&
            preset.rampUpSeconds === ramp
        );
    });
    return match ?? 'custom';
}

export function estimateRequests({
    targetRps,
    durationSeconds,
    rampUpSeconds,
}: LoadPreset): number {
    const ramp = Math.min(Math.max(rampUpSeconds, 0), durationSeconds);
    return Math.round(targetRps * (durationSeconds - ramp / 2));
}
