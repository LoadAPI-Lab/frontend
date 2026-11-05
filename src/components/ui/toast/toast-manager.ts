import { Toast } from '@base-ui/react/toast';
import type { ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export const toastManager = Toast.createToastManager();

interface ToastInput {
    title: ReactNode;
    description?: ReactNode;
}

function show(type: ToastKind, { title, description }: ToastInput) {
    return toastManager.add({
        type,
        title,
        description,
        timeout: type === 'error' ? 8000 : 4000,
        priority: type === 'error' ? 'high' : 'low',
    });
}

export const toast = {
    success: (input: ToastInput) => show('success', input),
    error: (input: ToastInput) => show('error', input),
    info: (input: ToastInput) => show('info', input),
    dismiss: (id?: string) => toastManager.close(id),
};
