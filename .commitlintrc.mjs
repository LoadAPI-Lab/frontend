export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'scope-enum': [
            1,
            'always',
            [
                'auth',
                'collections',
                'stress-tests',
                'scenarios',
                'history',
                'ui',
                'shared',
                'layout',
                'api',
                'app',
                'i18n',
                'e2e',
                'ci',
                'docker',
                'deps',
            ],
        ],
    },
};
