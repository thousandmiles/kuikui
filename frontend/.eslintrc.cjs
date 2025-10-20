module.exports = {
    root: true,
    env: { 
        browser: true, 
        es2020: true 
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'prettier'
    ],
    ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.ts', 'vitest.config.ts', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'test/**/*'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.json']
    },
    plugins: [
        '@typescript-eslint',
        'react',
        'react-hooks',
        'react-refresh',
        'jsx-a11y',
        'prettier'
    ],
    settings: {
        react: {
            version: 'detect'
        }
    },
    rules: {
        // Prettier integration
        'prettier/prettier': 'error',
        
        // React rules
        'react-refresh/only-export-components': [
            'warn',
            { allowConstantExport: true },
        ],
        'react/prop-types': 'off', // Using TypeScript for props
        'react/react-in-jsx-scope': 'off', // React 17+ JSX transform
        'react/jsx-uses-react': 'off', // React 17+ JSX transform
        'react/jsx-key': 'error',
        'react/jsx-no-duplicate-props': 'error',
        'react/jsx-no-undef': 'error',
        'react/no-array-index-key': 'warn',
        'react/no-danger': 'warn',
        'react/no-deprecated': 'error',
        'react/no-direct-mutation-state': 'error',
        'react/no-unescaped-entities': 'error',
        'react/self-closing-comp': 'error',
        
        // React Hooks rules
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        
        // TypeScript rules
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/no-unnecessary-condition': 'warn',
        
        // Accessibility rules
        'jsx-a11y/alt-text': 'error',
        'jsx-a11y/anchor-has-content': 'error',
        'jsx-a11y/click-events-have-key-events': 'warn',
        'jsx-a11y/no-static-element-interactions': 'warn',
        
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
    },
};
