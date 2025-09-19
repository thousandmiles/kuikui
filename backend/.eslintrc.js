module.exports = {
    root: true,
    env: {
        node: true,
        es2022: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'prettier'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json']
    },
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
        // Prettier integration
        'prettier/prettier': 'error',
        
        // TypeScript rules
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/no-unnecessary-condition': 'warn',
        
        // General code quality
        'prefer-const': 'error',
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'prefer-arrow-callback': 'error',
        'prefer-template': 'error',
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        
        // Async/Promise rules
        'require-await': 'error',
        'no-return-await': 'error',
    },
    ignorePatterns: ['dist', 'node_modules', '*.js'],
};
