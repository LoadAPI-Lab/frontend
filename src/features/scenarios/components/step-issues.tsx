import { CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { GENERATORS, generatorToken } from '@/lib/placeholders';

import type { StepIssue } from '../scenario-checks';

export function StepIssueText({ issue }: { issue: StepIssue }) {
    const { t } = useTranslation();
    switch (issue.kind) {
        case 'noUrl': {
            return t('scenarios.issues.noUrl');
        }
        case 'pathParam': {
            return t('scenarios.issues.pathParam', { param: issue.param });
        }
        case 'undefinedVariable': {
            return issue.laterStep === undefined
                ? t('scenarios.issues.undefinedVariable', { name: `{{${issue.name}}}` })
                : t('scenarios.issues.extractedLater', {
                      name: `{{${issue.name}}}`,
                      step: issue.laterStep,
                  });
        }
        case 'unknownGenerator': {
            return t('scenarios.issues.unknownGenerator', {
                token: `{{$${issue.name}}}`,
                known: GENERATORS.map(generatorToken).join(', '),
            });
        }
        case 'invalidBody': {
            return t('scenarios.issues.invalidBody');
        }
        case 'extractName': {
            return issue.name === ''
                ? t('scenarios.issues.extractNoName')
                : t('scenarios.issues.extractName', { name: issue.name });
        }
        default: {
            return t('scenarios.issues.extractPath', { name: issue.name });
        }
    }
}

export function StepIssues({ issues, className }: { issues: StepIssue[]; className?: string }) {
    if (issues.length === 0) {
        return null;
    }
    return (
        <ul className={cn('flex flex-col gap-1', className)}>
            {issues.map((issue) => (
                <li
                    key={JSON.stringify(issue)}
                    className="text-danger flex items-start gap-1.5 text-base"
                >
                    <CircleAlert
                        aria-hidden
                        className="mt-0.5 size-3.5 shrink-0"
                    />
                    <span>
                        <StepIssueText issue={issue} />
                    </span>
                </li>
            ))}
        </ul>
    );
}
