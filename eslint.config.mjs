import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: [
      'src/components/community/mapview.tsx',
      'src/components/community/search.tsx',
      'src/components/tools/rebornai-blocks.tsx',
      'src/components/tools/techlist.tsx',
    ],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'public/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
