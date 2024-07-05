/* eslint-env node */
module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    root: true,
    rules: {
        'semi': 'off',
        '@typescript-eslint/semi': 'error',
        'quotes': 'off',
        '@typescript-eslint/quotes': ['error', 'single'],
        '@typescript-eslint/no-explicit-any': 'off',
        'indent': ['error', 4],
        'no-console': 0,
    }
};