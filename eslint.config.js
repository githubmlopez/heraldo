import tseslint from '@typescript-eslint/eslint-plugin';
import prettierRecomendado from 'eslint-plugin-prettier/recommended';

export default [
  { ignores: ['dist/', 'node_modules/', 'salida/'] },
  ...tseslint.configs['flat/recommended'],
  {
    rules: {
      // Permite descartar propiedades con desestructuracion: const { omitida: _omitida, ...resto } = obj
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
  prettierRecomendado,
];
