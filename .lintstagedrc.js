export default {
  '*.{ts,tsx}': (filenames) => [
    `eslint --fix ${filenames.join(' ')}`,
    `prettier --write ${filenames.join(' ')}`,
  ],
  '*.{js,jsx,json,md}': (filenames) => [`prettier --write ${filenames.join(' ')}`],
};
