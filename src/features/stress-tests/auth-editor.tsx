import { useTranslation } from 'react-i18next';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SecretInput } from '@/components/ui/secret-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    type ApiKeyLocation,
    type AuthConfig,
    type AuthKind,
    emptyAuth,
} from '@/lib/request-draft';

export interface AuthEditorProps {
    auth: AuthConfig;
    onChange: (auth: AuthConfig) => void;
    readOnly?: boolean;
}

const KINDS: AuthKind[] = ['none', 'bearer', 'basic', 'apiKey'];
const LOCATIONS: ApiKeyLocation[] = ['header', 'query'];

function AuthFields({ auth, onChange, readOnly = false }: AuthEditorProps) {
    const { t } = useTranslation();
    if (auth.kind === 'bearer') {
        return (
            <Field.Root>
                <Field.Label>{t('requestAuth.token')}</Field.Label>
                <SecretInput
                    value={auth.token}
                    readOnly={readOnly}
                    onValueChange={(token) => onChange({ ...auth, token })}
                />
            </Field.Root>
        );
    }
    if (auth.kind === 'basic') {
        return (
            <div className="grid grid-cols-2 gap-3">
                <Field.Root>
                    <Field.Label>{t('requestAuth.username')}</Field.Label>
                    <Input
                        value={auth.username}
                        readOnly={readOnly}
                        autoComplete="off"
                        onValueChange={(username) => onChange({ ...auth, username })}
                    />
                </Field.Root>
                <Field.Root>
                    <Field.Label>{t('requestAuth.password')}</Field.Label>
                    <SecretInput
                        value={auth.password}
                        readOnly={readOnly}
                        onValueChange={(password) => onChange({ ...auth, password })}
                    />
                </Field.Root>
            </div>
        );
    }
    if (auth.kind === 'apiKey') {
        return (
            <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                    <Field.Root>
                        <Field.Label>{t('requestAuth.keyName')}</Field.Label>
                        <Input
                            value={auth.name}
                            readOnly={readOnly}
                            placeholder="X-API-Key"
                            spellCheck={false}
                            className="font-mono"
                            onValueChange={(name) => onChange({ ...auth, name })}
                        />
                    </Field.Root>
                    <Field.Root>
                        <Field.Label>{t('requestAuth.keyValue')}</Field.Label>
                        <SecretInput
                            value={auth.value}
                            readOnly={readOnly}
                            onValueChange={(value) => onChange({ ...auth, value })}
                        />
                    </Field.Root>
                </div>
                <SegmentedControl.Root<ApiKeyLocation>
                    aria-label={t('requestAuth.addTo')}
                    value={auth.location}
                    disabled={readOnly}
                    onValueChange={(location) => onChange({ ...auth, location })}
                    className="self-start"
                >
                    {LOCATIONS.map((location) => (
                        <SegmentedControl.Item
                            key={location}
                            value={location}
                        >
                            {t(`requestAuth.locations.${location}`)}
                        </SegmentedControl.Item>
                    ))}
                </SegmentedControl.Root>
            </div>
        );
    }
    return <p className="text-fg-muted text-base">{t('requestAuth.noneHint')}</p>;
}

export function AuthEditor({ auth, onChange, readOnly = false }: AuthEditorProps) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-4">
            <SegmentedControl.Root<AuthKind>
                aria-label={t('requestAuth.type')}
                value={auth.kind}
                disabled={readOnly}
                onValueChange={(kind) => onChange(emptyAuth(kind))}
                className="self-start"
            >
                {KINDS.map((kind) => (
                    <SegmentedControl.Item
                        key={kind}
                        value={kind}
                    >
                        {t(`requestAuth.kinds.${kind}`)}
                    </SegmentedControl.Item>
                ))}
            </SegmentedControl.Root>
            <AuthFields
                auth={auth}
                onChange={onChange}
                readOnly={readOnly}
            />
        </div>
    );
}
