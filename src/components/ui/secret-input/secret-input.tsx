import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/cn';

export type SecretInputProps = Omit<InputProps, 'type'>;

export function SecretInput({ className, ...props }: SecretInputProps) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    return (
        <div className={cn('relative', className)}>
            <Input
                type={visible ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                className="pr-9 font-mono"
                {...props}
            />
            <IconButton
                variant="ghost"
                aria-label={visible ? t('secretInput.hide') : t('secretInput.show')}
                aria-pressed={visible}
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
                onClick={() => setVisible((shown) => !shown)}
            >
                {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </IconButton>
        </div>
    );
}
