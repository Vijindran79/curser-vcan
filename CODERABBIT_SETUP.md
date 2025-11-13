# CodeRabbit AI Code Review Setup

## What is CodeRabbit?

CodeRabbit is an AI-powered code review tool that automatically reviews pull requests, providing intelligent feedback on:
- Code quality and best practices
- Potential bugs and security issues
- Performance optimizations
- TypeScript/React patterns
- Accessibility improvements

## Installation

### 1. Install CodeRabbit GitHub App

1. Visit [CodeRabbit GitHub App](https://github.com/apps/coderabbitai)
2. Click "Install" or "Configure"
3. Select the `Vijindran79/curser-vcan` repository
4. Grant necessary permissions

### 2. Configuration

The repository includes a `.coderabbit.yaml` configuration file that:
- Enables automatic reviews on pull requests to `main` and `develop` branches
- Excludes build artifacts, dependencies, and generated files
- Provides context-specific instructions for different file types
- Integrates with the project's tech stack (Vite, React, TypeScript, Firebase)

## Features Enabled

### Auto Review
- ✅ Automatic code review on new PRs
- ✅ High-level summary of changes
- ✅ Detailed walkthrough of modifications
- ✅ AI-generated review poem (fun feature!)
- ❌ Draft PRs are excluded

### Path Filters
Excluded from review:
- `node_modules/`
- `dist/`
- `.firebase/`
- `package-lock.json`
- Minified files (`.min.js`, `.min.css`)

### Language-Specific Reviews

#### TypeScript (`.ts`)
- Type safety checks
- Error handling verification
- Async/await best practices
- Null/undefined issue detection

#### React Components (`.tsx`)
- Component patterns and hooks usage
- State management review
- Accessibility (a11y) compliance
- Performance optimization suggestions

#### Firebase Functions (`functions/**/*.ts`)
- Firebase Functions best practices
- Security and validation checks
- Cold start optimization
- Error handling and logging

#### CSS Files
- Mobile responsiveness
- Accessibility and color contrast
- Performance considerations

## Using CodeRabbit

### On Pull Requests

When you create a PR, CodeRabbit will:
1. Automatically review the code within minutes
2. Post a high-level summary comment
3. Add inline comments on specific lines
4. Suggest improvements and optimizations

### Interacting with CodeRabbit

You can chat with CodeRabbit in PR comments:
- `@coderabbitai help` - Get help and available commands
- `@coderabbitai review` - Request a fresh review
- `@coderabbitai explain` - Get explanation of specific changes
- `@coderabbitai generate` - Generate documentation/tests

### Review Profile

The configuration uses the "chill" profile, which:
- Provides thorough but friendly reviews
- Focuses on important issues
- Doesn't request changes automatically
- Encourages best practices without being overly strict

## Customization

To modify CodeRabbit's behavior, edit `.coderabbit.yaml`:

```yaml
reviews:
  profile: chill  # Options: chill, assertive
  auto_review:
    enabled: true
    base_branches:
      - main
      - develop
```

## Knowledge Base

CodeRabbit learns from:
- Previous reviews and feedback
- Project-specific patterns
- Issues and discussions
- Team preferences

This helps provide more contextually relevant reviews over time.

## Support

- [CodeRabbit Documentation](https://docs.coderabbit.ai/)
- [GitHub Discussions](https://github.com/coderabbitai/coderabbit-ai/discussions)
- Email: support@coderabbit.ai

## Project Context

CodeRabbit is configured with context about this project:
- Vite + React + TypeScript stack
- Firebase backend (Functions, Firestore)
- Multiple API integrations (Shippo, Sea Rates, etc.)
- Focus on security, performance, and accessibility

This context helps CodeRabbit provide more relevant and accurate reviews specific to our logistics platform.
