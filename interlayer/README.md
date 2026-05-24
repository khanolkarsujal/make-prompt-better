# Vibe Prompt Engine - VS Code Extension

Intelligent prompt orchestration for AI coding tools - analyze, clarify, and enhance your prompts directly in VS Code.

## Features

- **Prompt Interception**: Select text in your editor and enhance it with AI-powered analysis
- **Intent Analysis**: Automatically detects the primary intent (create, modify, debug, explain, test)
- **Context Detection**: Identifies tech stack, project type, and features
- **Smart Suggestions**: Provides clarifying questions to improve your prompts
- **Enhanced Prompts**: Generates detailed, production-ready prompts optimized for AI coding agents
- **Keyboard Shortcut**: Use `Ctrl+Shift+V` (Windows) or `Cmd+Shift+V` (Mac) to enhance prompts
- **Sidebar Panel**: Access the prompt enhancer from the activity bar

## Requirements

- VS Code 1.120.0 or higher
- Backend API server running on `http://localhost:8000`
- Valid AI API key (Anthropic or xAI) configured in backend

## Installation

1. Install the backend dependencies and start the server:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. Install this extension in VS Code:
   - Download the `.vsix` file
   - Open VS Code
   - Go to Extensions → Install from VSIX
   - Select the downloaded file

## Usage

1. Select a prompt in your editor
2. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
3. Answer the clarifying questions in the QuickPick UI
4. View the enhanced prompt in a new document
5. Copy the enhanced prompt to use with your AI coding tool

## Configuration

The extension connects to the backend API at `http://localhost:8000`. Ensure the backend server is running before using the extension.

## Release Notes

### 1.0.0

- Initial release
- Prompt interception and enhancement
- Intent, context, and ambiguity analysis
- Clarifying question generation
- Enhanced prompt building
- Keyboard shortcut support
- Sidebar panel integration
