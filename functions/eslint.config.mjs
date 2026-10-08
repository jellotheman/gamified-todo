import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['lib/**', 'test/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
