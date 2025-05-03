# Claude AI Integration for VS Code

This extension integrates Claude AI into Visual Studio Code, enabling asynchronous collaboration and providing intelligent coding assistance directly within your development environment.

## Features

- **Chat Interface**: Communicate with Claude AI directly from VS Code
- **Code Analysis**: Get explanations and improvements for selected code
- **Context Awareness**: Claude can understand the context of your project
- **Asynchronous Collaboration**: Work with Claude even when offline through a local WebSocket server
- **Customizable Settings**: Configure Claude's behavior and response style

## Requirements

- Visual Studio Code 1.70.0 or higher
- Claude API key (obtainable from Anthropic)

## Installation

1. Install from VS Code Marketplace or by searching "Claude AI Integration" in the Extensions view
2. Set your Claude API key in the extension settings

## Setup

1. Open VS Code Settings (File > Preferences > Settings)
2. Search for "Claude Integration"
3. Enter your Claude API key in the appropriate field
4. Customize other settings as needed

## Usage

### Chat Panel

1. Open the Claude Chat Panel using the command palette (Ctrl+Shift+P) and selecting "Claude: Open Chat Panel"
2. Type your questions or requests in the input box
3. Press Enter or click "Send" to communicate with Claude

### Code Assistance

1. Select code in the editor
2. Right-click and choose "Claude: Send Selection to Claude" or "Claude: Explain Selected Code"
3. View Claude's response in the chat panel

### Available Commands

- `/clear` - Clear chat history
- `/context` - Send current file context to Claude
- `/help` - Show help message

### Configuration Options

- **API Key**: Your Claude API key
- **Server Port**: Port for the WebSocket server (default: 3000)
- **Model**: Claude model to use (default: claude-3-7-sonnet-20250219)
- **Temperature**: Controls randomness in responses (0-1, default: 0.7)

## Extension Commands

- `claudeIntegration.openPanel`: Open the Claude chat panel
- `claudeIntegration.sendSelectionToClaude`: Send selected code to Claude
- `claudeIntegration.explainCode`: Ask Claude to explain selected code

## Architecture

This extension uses a WebSocket server to enable asynchronous communication with Claude AI. The architecture consists of:

1. **VS Code Extension**: Handles UI integration and user interactions
2. **WebSocket Server**: Manages communication between VS Code and Claude
3. **Claude API Client**: Interfaces with Anthropic's Claude AI service

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the MIT License.

## Acknowledgements

- Anthropic for providing the Claude AI API
- VS Code extension development community

---

**Note**: This extension requires an API key from Anthropic to function properly. You can obtain an API key by signing up at [Anthropic's website](https://www.anthropic.com/).
