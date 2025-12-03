# PreMerge Privacy Check - Usage Examples

## Basic Setup

Add this to your `.github/workflows/privacy-check.yml`:

```yaml
name: 'Privacy Check'
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  privacy-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: PreMerge Privacy Check
        uses: prady4the4bady/premerge-privacy-check@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Advanced Configuration

```yaml
name: 'Privacy Check'
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  privacy-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: PreMerge Privacy Check
        uses: prady4the4bady/premerge-privacy-check@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          scan-mode: 'pr-diff'  # Only scan PR changes
          fail-on-findings: 'true'  # Fail CI if secrets found
          exclude-patterns: 'test/,mock/,example-,*.test.js,*.spec.js'
```

## For Large Teams

```yaml
name: 'Security & Privacy Check'
on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths-ignore:
      - 'docs/**'
      - '*.md'
      - 'examples/**'

jobs:
  security-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: PreMerge Privacy Check
        uses: prady4the4bady/premerge-privacy-check@v1
        id: privacy
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-on-findings: 'false'  # Allow manual review

      - name: Require Security Review
        if: steps.privacy.outputs.critical-count > 0
        run: |
          echo "🚨 Critical security findings require review"
          echo "Findings: ${{ steps.privacy.outputs.findings-count }}"
          exit 1
```

## Integration with Other Tools

```yaml
name: 'Complete PR Check'
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Lint Code
        run: npm run lint

      - name: Run Tests
        run: npm test

      - name: PreMerge Privacy Check
        uses: prady4the4bady/premerge-privacy-check@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          exclude-patterns: 'test/,__tests__/,*.test.js'

      - name: Security Scan
        uses: github/super-linter@v5
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Custom Branch Protection

Configure branch protection rules to require this check:

1. Go to repository Settings → Branches
2. Add rule for `main`/`master` branch
3. Under "Require status checks to pass", add:
   - `privacy-check` (or your job name)
4. Check "Require branches to be up to date"

## Handling False Positives

If you get false positives, add patterns to exclude:

```yaml
exclude-patterns: 'test/,mock/,example-,*.fixture.js,*.stub.js'
```

Common false positive sources:
- Test files with fake data
- Example/documentation files
- Mock/stub files
- Configuration templates

## Monitoring and Metrics

The action provides outputs you can use in other steps:

```yaml
- name: PreMerge Privacy Check
  id: privacy
  uses: prady4the4bady/premerge-privacy-check@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Log Metrics
  run: |
    echo "Total findings: ${{ steps.privacy.outputs.findings-count }}"
    echo "Critical issues: ${{ steps.privacy.outputs.critical-count }}"
    echo "High priority: ${{ steps.privacy.outputs.high-count }}"
```

## Troubleshooting

### Action Not Running
- Check that the workflow file is in `.github/workflows/`
- Verify the action reference: `uses: prady4the4bady/premerge-privacy-check@v1`
- Ensure `GITHUB_TOKEN` is available

### Too Many False Positives
- Add more exclude patterns
- Check if test files are being scanned unnecessarily
- Consider using `paths` or `paths-ignore` in workflow triggers

### Missing Secrets Detection
- The action only scans PR diffs, not entire repository
- Some patterns may be too conservative to avoid false positives
- Consider adding custom patterns for your specific secrets

### Performance Issues
- Large PRs may take longer to scan
- Consider breaking large changes into smaller PRs
- Use `paths-ignore` to skip documentation-only changes