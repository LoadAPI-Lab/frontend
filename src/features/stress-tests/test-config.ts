export const TARGET_RPS = { min: 1, max: 1000 } as const;
export const DURATION_SECONDS = { min: 1, max: 600 } as const;

export interface TestConfig {
    targetRps: number | null;
    durationSeconds: number | null;
    rampUpSeconds: number | null;
}

export type ConfigField = keyof TestConfig;

export type ConfigIssue =
    | { kind: 'required' }
    | { kind: 'wholeNumber' }
    | { kind: 'range'; min: number; max: number }
    | { kind: 'rampLongerThanDuration'; max: number };

export type ConfigIssues = Partial<Record<ConfigField, ConfigIssue>>;

export const DEFAULT_CONFIG: TestConfig = { targetRps: 100, durationSeconds: 60, rampUpSeconds: 0 };

function checkRange(value: number | null, min: number, max: number): ConfigIssue | undefined {
    if (value === null) {
        return { kind: 'required' };
    }
    if (!Number.isInteger(value)) {
        return { kind: 'wholeNumber' };
    }
    if (value < min || value > max) {
        return { kind: 'range', min, max };
    }
    return undefined;
}

export function validateConfig(config: TestConfig): ConfigIssues {
    const issues: ConfigIssues = {};
    const rps = checkRange(config.targetRps, TARGET_RPS.min, TARGET_RPS.max);
    const duration = checkRange(config.durationSeconds, DURATION_SECONDS.min, DURATION_SECONDS.max);
    if (rps) {
        issues.targetRps = rps;
    }
    if (duration) {
        issues.durationSeconds = duration;
    }
    const ramp = config.rampUpSeconds ?? 0;
    if (!Number.isInteger(ramp)) {
        issues.rampUpSeconds = { kind: 'wholeNumber' };
    } else if (ramp < 0) {
        issues.rampUpSeconds = {
            kind: 'range',
            min: 0,
            max: config.durationSeconds ?? DURATION_SECONDS.max,
        };
    } else if (!duration && config.durationSeconds !== null && ramp > config.durationSeconds) {
        issues.rampUpSeconds = { kind: 'rampLongerThanDuration', max: config.durationSeconds };
    }
    return issues;
}
