module.exports = [
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        module: 'readonly'
      }
    },
    rules: {
      'no-console': 'off', 
      'no-undef': 'off' 
    }
  },
  {
    ignores: ['node_modules/', 'dist/']
  }
];