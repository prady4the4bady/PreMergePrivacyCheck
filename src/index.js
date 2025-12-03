const core = require('@actions/core');
const github = require('@actions/github');

// PreMerge Privacy Check - Secret & PII PR Scanner
// Made by prady

// Comprehensive regex patterns for secrets and PII
const SECRET_PATTERNS = [
  // API Keys and Tokens
  {
    name: 'AWS Access Key ID',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: 'high',
    remediation: 'Rotate this AWS access key immediately. Generate a new key pair and update all applications.'
  },
  {
    name: 'AWS Secret Access Key',
    pattern: /\b(?:AKIA[0-9A-Z]{16})?[a-zA-Z0-9+/]{40}\b/g,
    severity: 'critical',
    remediation: 'This appears to be an AWS secret access key. Rotate immediately and revoke all permissions.'
  },
  {
    name: 'GitHub Personal Access Token',
    pattern: /\bghp_[a-zA-Z0-9]{36}\b/g,
    severity: 'critical',
    remediation: 'GitHub token detected! Revoke this token immediately from GitHub settings and generate a new one.'
  },
  {
    name: 'GitHub OAuth Token',
    pattern: /\bgho_[a-zA-Z0-9]{36}\b/g,
    severity: 'critical',
    remediation: 'GitHub OAuth token detected! Revoke this token and regenerate application secrets.'
  },
  {
    name: 'Slack Token',
    pattern: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/g,
    severity: 'high',
    remediation: 'Slack token detected. Rotate this token in Slack admin panel.'
  },
  {
    name: 'Stripe API Key',
    pattern: /\bsk_(?:live|test)_[a-zA-Z0-9]{24}\b/g,
    severity: 'critical',
    remediation: 'Stripe API key detected! Rotate this key immediately in Stripe dashboard.'
  },
  {
    name: 'PayPal API Key',
    pattern: /\bA[a-zA-Z0-9]{20,}\b/g,
    severity: 'high',
    remediation: 'PayPal API key detected. Rotate this key in PayPal developer console.'
  },
  {
    name: 'Google API Key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    severity: 'high',
    remediation: 'Google API key detected. Rotate this key in Google Cloud Console.'
  },
  {
    name: 'JWT Token',
    pattern: /\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/]+\b/g,
    severity: 'medium',
    remediation: 'JWT token detected. Ensure this is not a long-lived token and consider rotating.'
  },
  {
    name: 'Generic API Key',
    pattern: /\bapi[_-]?key[a-zA-Z0-9_-]*[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?\b/gi,
    severity: 'medium',
    remediation: 'Potential API key detected. Verify if this is sensitive and rotate if necessary.'
  }
];

const PII_PATTERNS = [
  // Email addresses
  {
    name: 'Email Address',
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    severity: 'medium',
    remediation: 'Email address detected. Consider using placeholder emails or anonymizing this data.'
  },
  // Phone numbers (various formats)
  {
    name: 'US Phone Number',
    pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    severity: 'medium',
    remediation: 'Phone number detected. Consider anonymizing or using test data.'
  },
  // Social Security Numbers
  {
    name: 'US SSN',
    pattern: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g,
    severity: 'critical',
    remediation: 'Social Security Number detected! This must be removed immediately and never committed.'
  },
  // Credit card numbers (basic pattern)
  {
    name: 'Credit Card Number',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9]{2})[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/g,
    severity: 'critical',
    remediation: 'Credit card number detected! This must be removed immediately. Never commit payment information.'
  },
  // IP addresses
  {
    name: 'IPv4 Address',
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    severity: 'low',
    remediation: 'IP address detected. Consider if this should be anonymized for privacy.'
  },
  // Names (basic pattern - common first/last names)
  {
    name: 'Potential Full Name',
    pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    severity: 'low',
    remediation: 'Potential personal name detected. Consider anonymizing personal information.'
  }
];

async function scanContent(content, filePath, patterns) {
  const findings = [];

  for (const pattern of patterns) {
    const matches = content.match(pattern.pattern);
    if (matches) {
      for (const match of matches) {
        // Skip if match is in excluded patterns
        const excludePatterns = core.getInput('exclude-patterns').split(',').map(p => p.trim());
        const shouldExclude = excludePatterns.some(exclude =>
          filePath.includes(exclude) || match.includes(exclude)
        );

        if (!shouldExclude) {
          findings.push({
            type: pattern.name,
            severity: pattern.severity,
            file: filePath,
            match: match,
            remediation: pattern.remediation,
            line: getLineNumber(content, match)
          });
        }
      }
    }
  }

  return findings;
}

function getLineNumber(content, match) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match)) {
      return i + 1;
    }
  }
  return 0;
}

async function getPRDiff(octokit, owner, repo, prNumber) {
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  const diffFiles = [];

  for (const file of files) {
    if (file.status === 'added' || file.status === 'modified') {
      try {
        const { data: content } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.filename,
          ref: `refs/pull/${prNumber}/head`
        });

        if (content.type === 'file' && content.content) {
          const decodedContent = Buffer.from(content.content, 'base64').toString('utf-8');
          diffFiles.push({
            filename: file.filename,
            content: decodedContent,
            additions: file.additions,
            deletions: file.deletions
          });
        }
      } catch (error) {
        console.warn(`Could not fetch content for ${file.filename}:`, error.message);
      }
    }
  }

  return diffFiles;
}

async function createPRComment(octokit, owner, repo, prNumber, findings) {
  if (findings.length === 0) return;

  const severityEmoji = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚡',
    low: 'ℹ️'
  };

  let comment = '## 🔍 PreMerge Privacy Check Results\n\n';
  comment += 'I found potential secrets or PII in this PR that should be reviewed:\n\n';

  const groupedFindings = findings.reduce((acc, finding) => {
    if (!acc[finding.severity]) acc[finding.severity] = [];
    acc[finding.severity].push(finding);
    return acc;
  }, {});

  for (const [severity, sevFindings] of Object.entries(groupedFindings)) {
    comment += `### ${severityEmoji[severity]} ${severity.toUpperCase()} (${sevFindings.length})\n\n`;
    for (const finding of sevFindings) {
      comment += `**${finding.type}** in \`${finding.file}\` (line ${finding.line}):\n`;
      comment += `- **Detected:** \`${finding.match}\`\n`;
      comment += `- **Remediation:** ${finding.remediation}\n\n`;
    }
  }

  comment += '---\n';
  comment += '💡 **Tips:**\n';
  comment += '- Use environment variables for secrets\n';
  comment += '- Add sensitive files to `.gitignore`\n';
  comment += '- Use placeholder/test data for development\n';
  comment += '- Consider using secret management tools like Vault or AWS Secrets Manager\n';

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: comment
  });
}

async function run() {
  try {
    const token = core.getInput('github-token', { required: true });
    const scanMode = core.getInput('scan-mode') || 'pr-diff';
    const failOnFindings = core.getInput('fail-on-findings') !== 'false';

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    let filesToScan = [];
    let allFindings = [];

    if (scanMode === 'pr-diff' && github.context.payload.pull_request) {
      const prNumber = github.context.payload.pull_request.number;
      core.info(`Scanning PR #${prNumber} for secrets and PII...`);

      filesToScan = await getPRDiff(octokit, owner, repo, prNumber);
    } else {
      core.warning('PR diff mode not available, skipping scan');
      return;
    }

    // Scan each file
    for (const file of filesToScan) {
      core.info(`Scanning ${file.filename}...`);

      // Scan for secrets
      const secretFindings = await scanContent(file.content, file.filename, SECRET_PATTERNS);
      allFindings.push(...secretFindings);

      // Scan for PII
      const piiFindings = await scanContent(file.content, file.filename, PII_PATTERNS);
      allFindings.push(...piiFindings);
    }

    // Remove duplicates and sort by severity
    const uniqueFindings = allFindings.filter((finding, index, self) =>
      index === self.findIndex(f => f.match === finding.match && f.file === finding.file)
    );

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    uniqueFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Output results
    if (uniqueFindings.length > 0) {
      core.warning(`Found ${uniqueFindings.length} potential secrets/PII`);

      for (const finding of uniqueFindings) {
        const level = finding.severity === 'critical' ? 'error' : 'warning';
        core[level](`${finding.type} in ${finding.file}: ${finding.match}`);
      }

      // Comment on PR if in PR context
      if (github.context.payload.pull_request) {
        await createPRComment(octokit, owner, repo, github.context.payload.pull_request.number, uniqueFindings);
      }

      if (failOnFindings) {
        core.setFailed(`Found ${uniqueFindings.length} potential secrets or PII. Please review and fix before merging.`);
      }
    } else {
      core.info('✅ No secrets or PII detected in this PR');
    }

    // Set output
    core.setOutput('findings-count', uniqueFindings.length.toString());
    core.setOutput('critical-count', uniqueFindings.filter(f => f.severity === 'critical').length.toString());
    core.setOutput('high-count', uniqueFindings.filter(f => f.severity === 'high').length.toString());

  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();