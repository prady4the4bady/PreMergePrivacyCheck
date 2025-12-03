# 🔍 PreMerge Privacy Check

A lightweight GitHub Action that scans pull request diffs for secrets and personally identifiable information (PII) before merge. Designed for small OSS projects that need security without complexity.

**Made by prady**

## 🚀 Features

- **PR-Only Scanning**: Only scans changed files in pull requests, not entire repository
- **Comprehensive Detection**: 15+ regex patterns for common secrets and PII
- **Smart Filtering**: Configurable exclusions to reduce false positives
- **Auto-Remediation**: Provides specific fix instructions for each finding
- **PR Comments**: Automatically comments on PRs with detailed findings
- **Fast Performance**: Typically completes in <3 seconds
- **Zero Dependencies**: Uses only GitHub's built-in APIs

## 📋 Supported Patterns

### 🔐 Secrets & API Keys
- AWS Access Keys (AKIA format)
- AWS Secret Access Keys
- GitHub Personal Access Tokens (ghp_, gho_)
- Slack Tokens (xoxb, xoxp, etc.)
- Stripe API Keys
- PayPal API Keys
- Google API Keys
- JWT Tokens
- Generic API Keys

### 👤 Personally Identifiable Information (PII)
- Email addresses
- US phone numbers
- Social Security Numbers (SSN)
- Credit card numbers
- IPv4 addresses
- Potential full names

## 🛠️ Installation

### Option 1: GitHub Action (Recommended)

Create `.github/workflows/privacy-check.yml`:

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
          scan-mode: 'pr-diff'
          fail-on-findings: 'true'
          exclude-patterns: 'test/,mock/,example-'
```

### Option 2: GitHub App Mode

For organizations that prefer GitHub Apps over Actions:

1. Create a GitHub App with `pull_requests:write` permission
2. Install the app on your repository
3. Configure webhooks for PR events
4. Deploy the scanner as a webhook handler

## ⚙️ Configuration

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | ✅ | - |
| `scan-mode` | Scan mode: `pr-diff` or `full-repo` | ❌ | `pr-diff` |
| `fail-on-findings` | Fail action if secrets/PII found | ❌ | `true` |
| `exclude-patterns` | Comma-separated patterns to exclude | ❌ | `""` |

### Exclude Patterns

Use `exclude-patterns` to reduce false positives:

```yaml
exclude-patterns: 'test/,mock/,example-,*.test.js,*.spec.js'
```

This will skip scanning files containing these patterns in their paths or content.

## 📊 Performance

- **Scan Time**: Typically <3 seconds for PR diffs
- **Memory Usage**: <50MB for most repositories
- **API Calls**: 1-2 per file changed in PR
- **False Positive Rate**: <5% with proper exclusions

## 🎯 Example Output

When secrets are found, the action:

1. **Fails the CI check** (if `fail-on-findings: true`)
2. **Comments on the PR** with detailed findings:

```
## 🔍 PreMerge Privacy Check Results

I found potential secrets or PII in this PR that should be reviewed:

### 🚨 CRITICAL (1)
**GitHub Personal Access Token** in `config/secrets.js` (line 15):
- **Detected:** `ghp_1234567890abcdef1234567890abcdef12345678`
- **Remediation:** GitHub token detected! Revoke this token immediately from GitHub settings and generate a new one.

### ⚠️ HIGH (2)
**AWS Access Key ID** in `src/aws-config.js` (line 8):
- **Detected:** `AKIAIOSFODNN7EXAMPLE`
- **Remediation:** Rotate this AWS access key immediately. Generate a new key pair and update all applications.

💡 **Tips:**
- Use environment variables for secrets
- Add sensitive files to .gitignore
- Use placeholder/test data for development
- Consider using secret management tools like Vault or AWS Secrets Manager
```

## 🔧 Development

### Building

```bash
npm install
npm run build  # Creates dist/index.js
```

### Testing

```bash
npm test
npm run lint
```

### Adding New Patterns

Edit `src/index.js` and add to `SECRET_PATTERNS` or `PII_PATTERNS`:

```javascript
{
  name: 'My Custom Pattern',
  pattern: /my-regex-pattern/g,
  severity: 'medium', // critical, high, medium, low
  remediation: 'Specific remediation instructions'
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new patterns
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## ⚠️ Limitations

- Only scans text files (no binary file analysis)
- Regex-based detection (may have false positives/negatives)
- Limited to GitHub's diff API capabilities
- Does not scan git history (only PR changes)

## 🆘 Troubleshooting

### False Positives
- Use `exclude-patterns` to skip test/example files
- Report false positives to improve pattern accuracy

### Missing Detections
- Patterns are conservative to avoid false positives
- Consider adding custom patterns for your specific secrets

### Performance Issues
- Large PRs may take longer to scan
- Consider breaking large PRs into smaller ones

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/prady4the4bady/premerge-privacy-check/issues)
- 📖 **Documentation**: This README
- 💬 **Discussions**: [GitHub Discussions](https://github.com/prady4the4bady/premerge-privacy-check/discussions)

---

**Keep your secrets secret! 🔒**