// VS Code Extension for Claude Integration
// This extension creates a WebSocket server that VS Code can use to communicate with Claude AI
// File structure:
// - src/
//   - extension.ts (main extension code)
//   - claudeClient.ts (API client for Claude)
//   - webSocketServer.ts (WebSocket server for async communication)
//   - statusBar.ts (Status bar integration)
//   - commands.ts (Command handlers)
//   - utils.ts (Utility functions)
// - package.json (Extension manifest)

// extension.ts - Main extension entry point
import * as vscode from 'vscode';
import { startWebSocketServer, stopWebSocketServer } from './webSocketServer';
import { registerStatusBar, updateStatusBar } from './statusBar';
import { registerCommands } from './commands';
import { getApiKey } from './utils';

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Activating Claude VS Code Integration Extension');
    
    // Check if API key is configured
    const apiKey = getApiKey();
    if (!apiKey) {
        vscode.window.showWarningMessage('Claude API key not found. Please configure it in settings.');
    }

    // Register the status bar
    const statusBarItem = registerStatusBar(context);
    
    // Register commands
    registerCommands(context);
    
    // Start WebSocket server
    try {
        const port = vscode.workspace.getConfiguration('claudeIntegration').get('serverPort', 3000);
        startWebSocketServer(port);
        updateStatusBar(statusBarItem, 'Connected');
        vscode.window.showInformationMessage(`Claude Integration: WebSocket server started on port ${port}`);
    } catch (error) {
        console.error('Failed to start WebSocket server:', error);
        updateStatusBar(statusBarItem, 'Error');
        vscode.window.showErrorMessage(`Failed to start Claude Integration: ${error.message}`);
    }
}

// This method is called when the extension is deactivated
export function deactivate() {
    console.log('Deactivating Claude VS Code Integration Extension');
    stopWebSocketServer();
}

// claudeClient.ts - API client for Claude
import axios from 'axios';
import { getApiKey } from './utils';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export interface ClaudeMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ClaudeResponse {
    id: string;
    content: string;
    conversation_id?: string;
    stop_reason?: string;
    model: string;
}

export async function sendMessageToClaude(messages: ClaudeMessage[], options: any = {}): Promise<ClaudeResponse> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Claude API key not found');
    }

    try {
        const response = await axios.post(
            CLAUDE_API_URL,
            {
                messages,
                model: options.model || 'claude-3-7-sonnet-20250219',
                max_tokens: options.maxTokens || 4096,
                temperature: options.temperature || 0.7,
                system: options.systemMessage || 'You are Claude, an AI assistant with access to the user\'s VS Code environment. Help the user with their coding tasks. You can see and manipulate code through the VS Code integration.'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                }
            }
        );

        return {
            id: response.data.id,
            content: response.data.content[0].text,
            conversation_id: response.data.conversation_id,
            stop_reason: response.data.stop_reason,
            model: response.data.model
        };
    } catch (error) {
        console.error('Error sending message to Claude:', error);
        throw error;
    }
}

// webSocketServer.ts - WebSocket server for async communication
import * as WebSocket from 'ws';
import * as http from 'http';
import { sendMessageToClaude, ClaudeMessage } from './claudeClient';

let server: http.Server | null = null;
let wss: WebSocket.Server | null = null;
let clients = new Set<WebSocket>();
let conversationHistory: ClaudeMessage[] = [];

export function startWebSocketServer(port: number) {
    if (server) {
        stopWebSocketServer();
    }

    server = http.createServer();
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws: WebSocket) => {
        console.log('Client connected to WebSocket server');
        clients.add(ws);

        // Send current conversation history to the client
        if (conversationHistory.length > 0) {
            ws.send(JSON.stringify({ 
                type: 'history', 
                data: conversationHistory 
            }));
        }

        ws.on('message', async (message: string) => {
            try {
                const parsedMessage = JSON.parse(message);
                
                switch (parsedMessage.type) {
                    case 'chat':
                        // Add user message to history
                        const userMessage: ClaudeMessage = {
                            role: 'user',
                            content: parsedMessage.data.content
                        };
                        conversationHistory.push(userMessage);
                        
                        // Send message to Claude API
                        const response = await sendMessageToClaude(
                            conversationHistory,
                            parsedMessage.data.options
                        );
                        
                        // Add Claude's response to history
                        const assistantMessage: ClaudeMessage = {
                            role: 'assistant',
                            content: response.content
                        };
                        conversationHistory.push(assistantMessage);
                        
                        // Broadcast to all clients
                        broadcastMessage({
                            type: 'chatResponse',
                            data: {
                                id: response.id,
                                content: response.content,
                                conversation_id: response.conversation_id,
                                stop_reason: response.stop_reason
                            }
                        });
                        break;
                        
                    case 'codeContext':
                        // Handle code context update
                        broadcastMessage({
                            type: 'codeContextUpdate',
                            data: parsedMessage.data
                        });
                        break;
                        
                    case 'clearHistory':
                        // Clear conversation history
                        conversationHistory = [];
                        broadcastMessage({
                            type: 'historyCleared',
                            data: {}
                        });
                        break;
                        
                    default:
                        console.log('Unknown message type:', parsedMessage.type);
                }
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    data: { message: error.message } 
                }));
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected from WebSocket server');
            clients.delete(ws);
        });
    });

    server.listen(port, () => {
        console.log(`WebSocket server listening on port ${port}`);
    });

    return server;
}

export function stopWebSocketServer() {
    if (server) {
        server.close();
        server = null;
    }
    
    if (wss) {
        wss.close();
        wss = null;
    }
    
    clients.clear();
}

export function broadcastMessage(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

// statusBar.ts - Status bar integration
import * as vscode from 'vscode';

export function registerStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'claudeIntegration.openPanel';
    statusBarItem.text = '$(hubot) Claude: Initializing...';
    statusBarItem.tooltip = 'Click to open Claude chat panel';
    statusBarItem.show();
    
    context.subscriptions.push(statusBarItem);
    
    return statusBarItem;
}

export function updateStatusBar(statusBarItem: vscode.StatusBarItem, status: string) {
    switch (status) {
        case 'Connected':
            statusBarItem.text = '$(hubot) Claude: Connected';
            statusBarItem.tooltip = 'Claude Integration is running. Click to open chat panel.';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'Disconnected':
            statusBarItem.text = '$(hubot) Claude: Disconnected';
            statusBarItem.tooltip = 'Claude Integration is disconnected. Click to reconnect.';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            break;
        case 'Error':
            statusBarItem.text = '$(hubot) Claude: Error';
            statusBarItem.tooltip = 'Claude Integration encountered an error. Click for details.';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            break;
        case 'Processing':
            statusBarItem.text = '$(sync~spin) Claude: Processing...';
            statusBarItem.tooltip = 'Claude is processing your request...';
            statusBarItem.backgroundColor = undefined;
            break;
        default:
            statusBarItem.text = `$(hubot) Claude: ${status}`;
            statusBarItem.tooltip = 'Claude Integration';
            statusBarItem.backgroundColor = undefined;
    }
}

// commands.ts - Command handlers
import * as vscode from 'vscode';
import * as path from 'path';
import { broadcastMessage } from './webSocketServer';
import { sendMessageToClaude, ClaudeMessage } from './claudeClient';
import { updateStatusBar } from './statusBar';

let chatPanel: vscode.WebviewPanel | undefined;

export function registerCommands(context: vscode.ExtensionContext) {
    // Register command to open chat panel
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeIntegration.openPanel', () => {
            createChatPanel(context);
        })
    );
    
    // Register command to send selected code to Claude
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeIntegration.sendSelectionToClaude', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }
            
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            if (!selectedText) {
                vscode.window.showErrorMessage('No text selected');
                return;
            }
            
            // Create chat panel if it doesn't exist
            if (!chatPanel) {
                createChatPanel(context);
            }
            
            // Send selected code to Claude
            const fileName = path.basename(editor.document.fileName);
            const message = `Here's the code from ${fileName} that I want help with:\n\n\`\`\`\n${selectedText}\n\`\`\``;
            
            // Send message to Claude via WebSocket
            broadcastMessage({
                type: 'chat',
                data: {
                    content: message,
                    options: {}
                }
            });
        })
    );
    
    // Register command to explain code
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeIntegration.explainCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }
            
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            if (!selectedText) {
                vscode.window.showErrorMessage('No text selected');
                return;
            }
            
            // Create chat panel if it doesn't exist
            if (!chatPanel) {
                createChatPanel(context);
            }
            
            // Send selected code to Claude for explanation
            const fileName = path.basename(editor.document.fileName);
            const message = `Please explain this code from ${fileName}:\n\n\`\`\`\n${selectedText}\n\`\`\``;
            
            // Send message to Claude via WebSocket
            broadcastMessage({
                type: 'chat',
                data: {
                    content: message,
                    options: {}
                }
            });
        })
    );
}

function createChatPanel(context: vscode.ExtensionContext) {
    if (chatPanel) {
        chatPanel.reveal();
        return;
    }
    
    chatPanel = vscode.window.createWebviewPanel(
        'claudeChat',
        'Claude Chat',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, 'media')
            ]
        }
    );
    
    // Load HTML content
    chatPanel.webview.html = getChatPanelHtml(chatPanel.webview, context);
    
    // Handle messages from the webview
    chatPanel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'sendMessage':
                broadcastMessage({
                    type: 'chat',
                    data: {
                        content: message.text,
                        options: message.options || {}
                    }
                });
                break;
                
            case 'clearHistory':
                broadcastMessage({
                    type: 'clearHistory',
                    data: {}
                });
                break;
                
            case 'getContext':
                // Get current file context
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const document = editor.document;
                    const fileName = document.fileName;
                    const fileContent = document.getText();
                    
                    broadcastMessage({
                        type: 'codeContext',
                        data: {
                            fileName,
                            fileContent,
                            language: document.languageId
                        }
                    });
                }
                break;
        }
    });
    
    // Clean up when panel is closed
    chatPanel.onDidDispose(() => {
        chatPanel = undefined;
    });
}

function getChatPanelHtml(webview: vscode.Webview, context: vscode.ExtensionContext): string {
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js')
    );
    
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'style.css')
    );
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Chat</title>
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <div class="chat-container">
        <div class="chat-messages" id="messages">
            <div class="welcome-message">
                <h2>Welcome to Claude Integration</h2>
                <p>Ask Claude for help with your code. You can also use the following commands:</p>
                <ul>
                    <li><code>/clear</code> - Clear chat history</li>
                    <li><code>/context</code> - Send current file context to Claude</li>
                    <li><code>/help</code> - Show this help message</li>
                </ul>
            </div>
        </div>
        <div class="chat-input-container">
            <textarea id="messageInput" placeholder="Ask Claude for help..." rows="3"></textarea>
            <button id="sendButton">Send</button>
        </div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
}

// utils.ts - Utility functions
import * as vscode from 'vscode';

export function getApiKey(): string | undefined {
    const config = vscode.workspace.getConfiguration('claudeIntegration');
    const apiKey = config.get<string>('apiKey');
    
    if (!apiKey) {
        return undefined;
    }
    
    return apiKey;
}
