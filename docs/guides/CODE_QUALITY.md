# Code Quality Guidelines

This project uses a comprehensive code quality setup with ESLint, Prettier, and Husky to ensure consistent code style and quality across the codebase.

## Tools

### ESLint

ESLint is configured with TypeScript support and recommended rules.

**Run linting:**

```bash
bun run lint        # Check for lint errors
bun run lint:fix    # Fix auto-fixable lint errors
```

### Prettier

Prettier is configured for consistent code formatting.

**Run formatting:**

```bash
bun run format        # Format all files
bun run format:check  # Check if files are formatted
```

### Husky

Husky is set up to run git hooks automatically.

**Pre-commit hook:**

- Runs `lint-staged` on staged files
- Automatically formats and lints code before committing
- Prevents commits with lint errors

### lint-staged

lint-staged runs linting and formatting only on staged files for better performance.

**Configuration:**

- TypeScript/TSX files: ESLint fix + Prettier
- JS/JSX/JSON/MD files: Prettier only

## Configuration Files

- `eslint.config.js` - ESLint configuration (Flat Config)
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Files to ignore for Prettier
- `.husky/pre-commit` - Pre-commit hook script
- `package.json` - lint-staged configuration

## VS Code Integration

The project includes VS Code settings for automatic formatting on save.

**Recommended extensions:**

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- Bun for VSCode (`oven.bun-vscode`)

**Settings included:**

- Format on save enabled
- ESLint auto-fix on save
- Consistent line endings (LF)
- Trim trailing whitespace
- Insert final newline

## Rules

### ESLint Rules

- **TypeScript:** Recommended TypeScript ESLint rules
- **Unused variables:** Error (except variables starting with `_`)
- **Any type:** Warning
- **Console statements:** Warning (only `console.warn` and `console.error` allowed)
- **Prettier integration:** All Prettier rules as ESLint errors

### Prettier Rules

- **Semi-colons:** Always
- **Quotes:** Single quotes
- **Trailing commas:** ES5 compatible
- **Print width:** 100 characters
- **Tab width:** 2 spaces
- **Line endings:** LF (Unix-style)

## Workflow

### Normal Development

1. Write code
2. Save files (VS Code auto-formats if configured)
3. Run `bun run lint:fix` if needed
4. Stage files with `git add`
5. Commit (pre-commit hook runs automatically)

### CI/CD

The following commands should be run in CI:

```bash
bun run format:check  # Verify formatting
bun run lint          # Verify no lint errors
bun run test          # Run tests
bun run build         # Build all packages
```

## Troubleshooting

### Pre-commit hook not running

```bash
# Reinstall hooks
bun run prepare
chmod +x .husky/pre-commit
```

### ESLint errors in IDE

```bash
# Reinstall dependencies
bun install

# Restart VS Code ESLint server
# Command Palette > "ESLint: Restart ESLint Server"
```

### Formatting conflicts

If ESLint and Prettier conflict, Prettier always wins. The `eslint-config-prettier` package disables conflicting ESLint rules.

## Adding New Rules

### ESLint Rules

Edit `eslint.config.js` and add rules to the `rules` object:

```js
rules: {
  'your-rule': 'error',
}
```

### Prettier Rules

Edit `.prettierrc`:

```json
{
  "yourRule": true
}
```

## Skipping Hooks (Not Recommended)

If you need to skip the pre-commit hook (not recommended):

```bash
git commit --no-verify -m "your message"
```

**Note:** This should only be used in exceptional circumstances.
