---
mode: agent
---

## Goal

Analyze all current uncommitted changes in the Git repository
(`git diff --cached` or `git diff` if unstaged), group related changes
logically, propose appropriate commit messages for each group and execute the
commits directly.

## Requirements

1. **Analyze context**
   - Review added, modified, deleted, and renamed files.
   - Identify related patterns (e.g., same feature, same module, same test file
     group).
   - Detect code intent based on function/class/variable names, docstrings, and
     comments.

2. **Group changes logically**
   - Group by purpose or module, not by file type alone.
   - Examples:
     - “Refactor logging system”
     - “Fix bug in timeout handling”
     - “Add new unit tests for parser”
     - “Update README and documentation links”

3. **Generate commit messages**
   - Use **conventional commits** format (recommended):
     - `feat:` for new features
     - `fix:` for bug fixes
     - `docs:` for documentation
     - `refactor:` for code restructuring
     - `test:` for test changes
     - `chore:` for build/config changes
   - Example:
     - `feat(api): add retry logic for failed requests`
     - `fix(ui): correct alignment issue in settings panel`
     - `docs: update installation instructions`

4. **Output format**
   - List grouped file sets and their proposed commit message (concise and
     meaningful).
   - Example output:

     ```
     ## Suggested Commits

     ### Commit 1
     **Message:** feat(core): add retry mechanism for HTTP requests
     **Files:**
     - src/network/http_client.cpp
     - src/network/http_client.h

     ### Commit 2
     **Message:** docs: update configuration section in README
     **Files:**
     - README.md
     - docs/configuration.md
     ```

5. **Commit**
   - Execute actual git commands:
     ```bash
     git add src/network/http_client.cpp src/network/http_client.h
     git commit -m "feat(core): add retry mechanism for HTTP requests"
     ```
   - Then continue for each group.
