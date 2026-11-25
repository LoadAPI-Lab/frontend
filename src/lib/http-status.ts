export const KNOWN_STATUS_CODES = [
    '200',
    '201',
    '202',
    '204',
    '301',
    '302',
    '304',
    '400',
    '401',
    '403',
    '404',
    '405',
    '408',
    '409',
    '410',
    '413',
    '415',
    '422',
    '429',
    '500',
    '501',
    '502',
    '503',
    '504',
] as const;

export type KnownStatusCode = (typeof KNOWN_STATUS_CODES)[number];

export const isKnownStatusCode = (code: string): code is KnownStatusCode =>
    KNOWN_STATUS_CODES.some((known) => known === code);
