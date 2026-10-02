# Security Policy

## Supported Versions

Only the latest published version of Annoteca MindMap Bridge receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| older   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Annoteca MindMap Bridge, please report it **privately** so it can be fixed before public disclosure:

1. **DO NOT** open a public GitHub issue for security vulnerabilities.
2. Open the repository's **Security** tab and click **Report a vulnerability**, or use this direct link: <https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/security/advisories/new>
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

Reports submitted through GitHub private vulnerability reporting are visible only to you and the maintainer until an advisory is published.

### What to expect:

- Acknowledgment within 48 hours
- Assessment and response within 7 days
- Security patch released as soon as possible
- Credit given to reporter (unless you prefer to remain anonymous)

## Security Considerations

- No network access. The plugin makes no requests of any kind.
- No file writes of its own. It reads the note shown in a mind map. Note changes happen only through Annoteca, and only after you press a button or save Annoteca's comment form.
- No external commands or Node APIs.
