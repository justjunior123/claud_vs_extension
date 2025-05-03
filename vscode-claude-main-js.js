// main.js - Client-side WebSocket implementation for Claude VS Code extension
(function() {
    // WebSocket connection
    let socket;
    let isConnected = false;
    let reconnectInterval = null;
    const reconnectDelay = 2000; // ms
    
    // DOM elements
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    // vscode API
    const vscode = acquireVsCodeApi();
    
    // Initialize WebSocket connection
    function initializeWebSocket() {
        // Get port from extension settings (default to 3000)
        const port = 3000; // This should be configurable
        
        socket = new WebSocket(`ws://localhost:${port}`);
        
        socket.addEventListener('open', () => {
            console.log('Connected to Claude Integration WebSocket server');
            isConnected = true;
            clearReconnectInterval();
            
            // Add connected status message
            addSystemMessage('Connected to Claude Integration Server');
        });
        
        socket.addEventListener('message', (event) => {
            console.log('Message from server:', event.data);
            handleServerMessage(JSON.parse(event.data));
        });
        
        socket.addEventListener('close', () => {
            console.log('WebSocket connection closed');
            isConnected = false;
            
            // Add disconnected status message
            addSystemMessage('Disconnected from Claude Integration Server. Attempting to reconnect...');
            
            // Attempt to reconnect
            startReconnectInterval();
        });
        
        socket.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
            
            // Add error message
            addSystemMessage('Error connecting to Claude Integration Server');
        });
    }
    
    // Handle server messages
    function handleServerMessage(message) {
        switch (message.type) {
            case 'chatResponse':
                addAssistantMessage(message.data.content);
                break;
                
            case 'history':
                // Display conversation history
                if (message.data && Array.isArray(message.data)) {
                    messagesContainer.innerHTML = ''; // Clear existing messages
                    
                    message.data.forEach(msg => {
                        if (msg.role === 'user') {
                            addUserMessage(msg.content);
                        } else if (msg.role === 'assistant') {
                            addAssistantMessage(msg.content);
                        }
                    });
                }
                break;
                
            case 'historyCleared':
                // Clear messages container
                messagesContainer.innerHTML = '';
                addSystemMessage('Chat history cleared');
                break;
                
            case 'error':
                addErrorMessage(message.data.message);
                break;
                
            case 'codeContextUpdate':
                addSystemMessage(`Code context updated: ${message.data.fileName}`);
                break;
                
            default:
                console.log('Unknown message type:', message.type);
        }
        
        // Scroll to bottom after adding a message
        scrollToBottom();
    }
    
    // Add message to the chat container
    function addUserMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        
        // Format message with markdown
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">You</span>
            </div>
            <div class="message-content">${formatMessageContent(text)}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
    }
    
    function addAssistantMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message assistant-message';
        
        // Format message with markdown
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">Claude</span>
            </div>
            <div class="message-content">${formatMessageContent(text)}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
    }
    
    function addSystemMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-message';
        messageElement.textContent = text;
        
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
    }
    
    function addErrorMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message error-message';
        messageElement.textContent = `Error: ${text}`;
        
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
    }
    
    // Format message content with code highlighting
    function formatMessageContent(content) {
        // Replace code blocks with styled code
        content = content.replace(/```([a-zA-Z]*)\n([\s\S]*?)\n```/g, (match, language, code) => {
            return `<pre class="code-block ${language}"><code>${escapeHtml(code)}</code></pre>`;
        });
        
        // Replace inline code with styled code
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Handle basic markdown formatting
        content = content
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Lists
            .replace(/^\s*-\s+(.*)/gm, '<li>$1</li>')
            // Line breaks
            .replace(/\n/g, '<br>');
        
        return content;
    }
    
    // Escape HTML special characters
    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // Scroll to the bottom of the chat container
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Send message to server
    function sendMessage() {
        const messageText = messageInput.value.trim();
        
        if (!messageText) {
            return;
        }
        
        // Handle special commands
        if (messageText.startsWith('/')) {
            handleCommand(messageText);
            return;
        }
        
        if (!isConnected) {
            addErrorMessage('Not connected to server. Attempting to reconnect...');
            initializeWebSocket();
            return;
        }
        
        // Add user message to chat
        addUserMessage(messageText);
        
        // Send message to server
        socket.send(JSON.stringify({
            type: 'chat',
            data: {
                content: messageText,
                options: {}
            }
        }));
        
        // Clear input
        messageInput.value = '';
    }
    
    // Handle special commands
    function handleCommand(command) {
        command = command.toLowerCase();
        
        switch (command) {
            case '/clear':
                // Clear chat history
                vscode.postMessage({
                    command: 'clearHistory'
                });
                messageInput.value = '';
                break;
                
            case '/context':
                // Get current file context
                vscode.postMessage({
                    command: 'getContext'
                });
                messageInput.value = '';
                break;
                
            case '/help':
                // Show help message
                addSystemMessage(`
                    Available commands:
                    /clear - Clear chat history
                    /context - Send current file context to Claude
                    /help - Show this help message
                `);
                messageInput.value = '';
                break;
                
            default:
                addErrorMessage(`Unknown command: ${command}`);
                messageInput.value = '';
        }
    }
    
    // Start reconnection attempts
    function startReconnectInterval() {
        if (reconnectInterval === null) {
            reconnectInterval = setInterval(() => {
                console.log('Attempting to reconnect...');
                initializeWebSocket();
            }, reconnectDelay);
        }
    }
    
    // Clear reconnection interval
    function clearReconnectInterval() {
        if (reconnectInterval !== null) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    }
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    // Initialize
    initializeWebSocket();
})();
