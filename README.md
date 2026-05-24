# 🚀 Vibe Prompt Engine

Intelligent prompt orchestration for AI coding tools - analyze, clarify, and enhance your prompts.

## Overview

Vibe Prompt Engine is a full-stack application that transforms vague user prompts into detailed, production-ready instructions for AI coding tools like Cursor, Copilot, and Claude.

## Architecture

The system consists of three main components:

### 1. Backend API (FastAPI + Python)
- **Intent Analyzer**: Analyzes the user's primary intent (create, modify, debug, explain, test)
- **Context Detector**: Detects tech stack, project type, features, and missing context
- **Ambiguity Detector**: Identifies ambiguous terms and clarification needs
- **Suggestion Engine**: Generates clarifying questions and options based on analysis
- **Prompt Builder**: Creates enhanced, detailed prompts optimized for AI coding agents

### 2. VS Code Extension (JavaScript)
- Intercepts user prompts from the editor
- Displays clarifying questions via QuickPick UI
- Shows enhanced prompts in new documents
- Keyboard shortcut: `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)

### 3. Web Frontend (HTML + JavaScript)
- Modern web interface for prompt enhancement
- Interactive question/option selection
- Real-time prompt analysis and enhancement
- Copy-to-clipboard functionality

## Pipeline Flow

1. **User Input**: User types a command/idea (e.g., "make dashboard")
2. **Intercept & Capture**: VS Code Extension or Web UI captures the prompt
3. **Intent Analysis**: Backend analyzes prompt with Intent Analyzer, Context Detector, Ambiguity Detector
4. **Suggestion Engine**: Backend returns clarifying questions/options
5. **User Selection**: User answers questions via UI
6. **Prompt Builder**: Backend builds final enhanced prompt using selections and context
7. **Final Prompt**: Optimized prompt returned to user
8. **Send to AI Tool**: User sends final prompt to AI coding tool (Cursor, Copilot, Claude)
9. **AI Generates Output**: AI tool generates response/code
10. **Result in Editor**: Generated output appears in the editor

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file with your Anthropic API key:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

6. Run the backend server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`

### VS Code Extension Setup

1. Navigate to the interlayer directory:
```bash
cd interlayer
```

2. Install dependencies:
```bash
npm install
```

3. Package the extension:
```bash
npm run package
```

4. Install the extension in VS Code:
   - Open VS Code
   - Go to Extensions → Install from VSIX
   - Select the generated `.vsix` file

5. Ensure the backend is running before using the extension

### Web Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Open `index.html` in a web browser
3. Ensure the backend is running at `http://localhost:8000`

## Usage

### VS Code Extension

1. Select a prompt in your editor
2. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
3. Answer the clarifying questions
4. Get an enhanced prompt ready for AI tools

### Web Interface

1. Open `frontend/index.html` in a browser
2. Enter your prompt in the text area
3. Click "Analyze & Enhance"
4. Answer the clarifying questions
5. Click "Build Enhanced Prompt"
6. Copy the enhanced prompt to clipboard

## API Endpoints

### POST /api/analyze
Analyzes a prompt and returns suggestions for clarification.

**Request:**
```json
{
  "prompt": "make dashboard"
}
```

**Response:**
```json
{
  "intent": {
    "primary_intent": "create",
    "confidence": 0.9,
    "domain": "web",
    "complexity": "medium"
  },
  "context": {
    "tech_stack": [],
    "project_type": "dashboard",
    "features": [],
    "missing_context": []
  },
  "ambiguity": {
    "ambiguous_terms": [],
    "clarification_needed": true,
    "ambiguity_score": 0.7
  },
  "suggestions": {
    "questions": [
      {
        "id": "q1",
        "question": "What type of dashboard?",
        "options": ["Analytics", "Admin", "Marketing", "Sales"],
        "category": "features"
      }
    ],
    "estimated_complexity": "medium"
  }
}
```

### POST /api/build
Builds an enhanced prompt based on user selections.

**Request:**
```json
{
  "prompt": "make dashboard",
  "selections": {
    "What type of dashboard?": "Analytics",
    "Preferred framework?": "React"
  },
  "intent": {...},
  "context": {...}
}
```

**Response:**
```json
{
  "enhanced_prompt": "Create a modern analytics dashboard using React...",
  "original_prompt": "make dashboard",
  "selections": {...},
  "metadata": {...}
}
```

## Technology Stack

- **Backend**: FastAPI, Python 3.10+, Anthropic API
- **VS Code Extension**: JavaScript, VS Code API, Axios
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **AI Models**: Claude 3.5 Sonnet (via Anthropic API)

## Features

- ✅ Intent Analysis (create, modify, debug, explain, test)
- ✅ Context Detection (tech stack, project type, features)
- ✅ Ambiguity Detection (identify unclear terms)
- ✅ Intelligent Suggestion Engine (clarifying questions)
- ✅ Prompt Builder (detailed, production-ready prompts)
- ✅ VS Code Extension integration
- ✅ Web interface for standalone use
- ✅ Keyboard shortcut support
- ✅ Copy-to-clipboard functionality

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
