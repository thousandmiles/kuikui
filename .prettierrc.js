module.exports = {
    // Basic formatting
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    
    // JavaScript/TypeScript specific
    quoteProps: 'as-needed',
    jsxSingleQuote: true,
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'avoid',
    
    // File handling
    endOfLine: 'lf',
    insertPragma: false,
    requirePragma: false,
    proseWrap: 'preserve',
    
    // Override for specific file types
    overrides: [
        {
            files: '*.json',
            options: {
                printWidth: 200,
            },
        },
        {
            files: '*.md',
            options: {
                proseWrap: 'always',
                printWidth: 80,
            },
        },
    ],
};