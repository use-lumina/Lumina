# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in Lumina, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security issues via one of these methods:

1. **Email:** security@lumina.dev (coming soon)
2. **GitHub Security Advisory:** Use the [GitHub Security Advisory](https://github.com/evansinho/Lumina/security/advisories/new) feature

### What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if you have one)
- Your contact information for follow-up

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** Depends on severity (critical issues within 7-14 days)

### Disclosure Policy

- We will acknowledge your report within 48 hours
- We will provide a detailed response indicating next steps
- We will notify you when the vulnerability is fixed
- We will publicly disclose the vulnerability after a fix is released (with credit to you, if desired)

### Bug Bounty

We do not currently have a paid bug bounty program, but we deeply appreciate security researchers' contributions and will publicly acknowledge your responsible disclosure.

## Security Best Practices

### For Self-Hosted Deployments

- **Use HTTPS:** Always use TLS/SSL for production deployments
- **Database Security:** Use strong passwords and restrict database access
- **API Keys:** Rotate API keys regularly, store them securely
- **Network Security:** Use firewalls, restrict ports, enable auth
- **Updates:** Keep Lumina and dependencies up to date
- **Monitoring:** Enable logging and monitor for suspicious activity

### For SDK Users

- **Environment Variables:** Never hardcode API keys in source code
- **Secrets Management:** Use secure secrets management (e.g., Vault, AWS Secrets Manager)
- **Input Validation:** Validate user inputs before passing to Lumina SDK
- **Rate Limiting:** Implement rate limiting on your API endpoints

## Known Security Considerations

### Data Privacy

- Lumina stores LLM prompts and responses in PostgreSQL
- For production use with sensitive data:
  - Enable PostgreSQL encryption at rest
  - Use network encryption (TLS)
  - Consider PII redaction before sending traces
  - Implement RBAC for dashboard access

### Authentication

- Current MVP implementation has basic API key authentication
- For production use:
  - Enable authentication on all services
  - Use strong API keys (min 32 characters)
  - Rotate keys regularly
  - Consider OAuth2/OIDC for SSO

## Security Updates

Security updates will be announced via:

- GitHub Security Advisories
- Release notes with `[SECURITY]` prefix
- Community Discord/Slack (when available)

## Contact

For non-security issues, use [GitHub Issues](https://github.com/evansinho/Lumina/issues).

For security concerns, use the reporting methods above.

---

**Thank you for helping keep Lumina secure!**
