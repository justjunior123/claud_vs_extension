# Quick Start Guide - Claude AI Integration for VS Code

This guide will help you quickly set up and start using the Claude AI Integration extension for Visual Studio Code.

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Claude AI Integration"
4. Click "Install"

## Configuration

### Set API Key

1. Open VS Code Settings (File > Preferences > Settings)
2. Search for "claudeIntegration.apiKey"
3. Enter your Anthropic Claude API key
   - If you don't have an API key, sign up at [Anthropic's website](https://www.anthropic.com/)

### Optional Configuration

You can customize the following settings:

- **Server Port**: Port for the WebSocket server (default: 3000)
- **Model**: Claude model version to use
- **Temperature**: Controls randomness in responses (0-1)

## Starting Claude

1. After installation, the extension will automatically activate
2. You should see a Claude icon in the status bar (bottom right)
3. Click on the icon to open the Claude chat panel

## Basic Commands

### Chat Panel

- Open the Command Palette (Ctrl+Shift+P)
- Type "Claude: Open Chat Panel"
- Start chatting with Claude

### Code Assistance

1. Select code in your editor
2. Right-click and select one of:
   - "Claude: Send Selection to Claude"
   - "Claude: Explain Selected Code"

## Chat Commands

In the chat panel, you can use these special commands:

- `/clear` - Clear chat history
- `/context` - Send current file context to Claude
- `/help` - Show available commands

## Keyboard Shortcuts

You may want to set keyboard shortcuts for common actions:

1. Open Keyboard Shortcuts (File > Preferences > Keyboard Shortcuts)
2. Search for "Claude"
3. Set shortcuts for commands like:
   - `claudeIntegration.openPanel`
   - `claudeIntegration.sendSelectionToClaude`
   - `claudeIntegration.explainCode`

## Troubleshooting

If you encounter issues:

1. Check your API key is correctly set
2. Ensure no other application is using the configured port
3. Check the Output panel (View > Output > Claude Integration) for error messages

## Getting Help

If you need assistance:

- Check the full README documentation
- Visit the extension's repository
- Contact your administrator if using in an enterprise setting

Happy coding with Claude assistance!
