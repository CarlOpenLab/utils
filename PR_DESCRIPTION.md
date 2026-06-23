# PR: ci: optimize docs workflow - auto-deploy to separate branch

## Summary

Optimized the documentation workflow to automatically deploy docs to a separate `docs` branch, removing docs from the main codebase to reduce PR size and improve CI efficiency.

## Changes

### 1. `.gitignore` - Exclude docs directory
```gitignore
docs
```

### 2. `.github/workflows/doc.yaml` - Optimized workflow

**Key improvements:**
- ✅ **Only runs on `main` branch push** (not on PRs)
- ✅ **Added `paths-ignore`** to skip unnecessary triggers
- ✅ **Added permissions** for better security
- ✅ **Added timeout** to prevent hanging jobs
- ✅ **Improved commit message** with `[skip ci]` to avoid CI loops

**Trigger conditions:**
```yaml
on:
  push:
    branches:
      - main
    paths-ignore:
      - 'docs/**'
      - 'README.md'
      - 'README_ZH.md'
      - 'CHANGELOG.md'
      - 'LICENSE'
      - '.github/**'
```

### 3. Removed docs from git tracking
- Docs are now generated and deployed automatically by CI
- No more docs changes in PRs

## Benefits

### Before
- ❌ Every PR included large docs diffs (60+ files)
- ❌ Docs workflow ran on every PR (wasted CI resources)
- ❌ Manual docs management required

### After
- ✅ PRs are clean and focused on code changes
- ✅ Docs auto-deploy only when main branch changes
- ✅ Docs are always up-to-date via CI
- ✅ Reduced PR review time

## How it works

1. **Developer pushes code to `main`**
2. **CI detects changes** (ignores docs, README, etc.)
3. **Doc workflow runs:**
   - Installs dependencies
   - Generates documentation
   - Deploys to `docs` branch automatically
4. **GitHub Pages** (if configured) serves from `docs` branch

## Documentation access

After merge, documentation will be available at:
- GitHub Pages: `https://cc-heart-dev/utils` (if enabled)
- Or directly from `docs` branch

## Breaking Changes

None. This is a CI/CD optimization only.

## Checklist

- [x] Updated `.gitignore` to exclude docs
- [x] Optimized doc.yaml workflow
- [x] Removed docs from git tracking
- [x] Tested workflow trigger conditions
- [x] Added proper permissions
- [x] Commit message follows conventional commits format
