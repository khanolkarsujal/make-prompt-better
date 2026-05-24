const vscode = require('vscode');
const axios = require('axios');

// ---- Config ----
const DEFAULT_BACKEND_URL = 'http://localhost:8000';

function getBackendUrl(context) {
  return context.globalState.get('vibeBackendUrl') || DEFAULT_BACKEND_URL;
}

// ---- Global state ----
let currentAnalysis = null;
let currentPrompt = '';
let currentEnhancedPrompt = '';
let sidebarPanel = null;
let sidebarView = null; // WebviewView provider instance (activity bar / sidebar)

function postToSidebar(msg) {
  try {
    if (sidebarPanel) sidebarPanel.webview.postMessage(msg);
    if (sidebarView && sidebarView.webview) sidebarView.webview.postMessage(msg);
  } catch (e) { /* ignore */ }
}

async function handleWebviewMessage(msg, context) {
  const backendUrl = getBackendUrl(context);

  switch (msg.command) {
    case 'analyze':
      currentPrompt = msg.prompt;
      await runAnalysisPipeline(msg.prompt, context);
      break;

    case 'selectOption':
      break;

    case 'build':
      await runBuildPipeline(msg.prompt, msg.selections, msg.intent, msg.context, context);
      break;

    case 'copyPrompt':
      if (currentEnhancedPrompt) {
        await vscode.env.clipboard.writeText(currentEnhancedPrompt);
        vscode.window.showInformationMessage('Vibe: Enhanced prompt copied to clipboard!');
      }
      break;

    case 'sendToAI':
      await insertPromptIntoEditor(currentEnhancedPrompt);
      break;

    case 'useTemplate':
      postToSidebar({ command: 'setPrompt', prompt: msg.prompt });
      break;

    case 'detectContext':
      const detectedContext = await detectProjectContext();
      postToSidebar({ command: 'contextDetected', context: detectedContext });
      break;

    case 'saveSettings':
      context.globalState.update('vibeBackendUrl', msg.backendUrl);
      vscode.window.showInformationMessage('Vibe: Settings saved!');
      break;

    case 'deleteHistory':
      let history2 = context.globalState.get('vibeHistory') || [];
      history2 = history2.filter(h => h.id !== msg.id);
      context.globalState.update('vibeHistory', history2);
      break;

    case 'openInEditor':
      if (currentEnhancedPrompt) {
        const doc = await vscode.workspace.openTextDocument({
          content: currentEnhancedPrompt,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
      }
      break;
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Vibe Prompt Engine is now active!');

  // --- Commands ---
  const enhanceCmd = vscode.commands.registerCommand('vibePromptEngine.enhancePrompt', async () => {
    await enhanceSelectedPrompt(context);
  });

  const sidebarCmd = vscode.commands.registerCommand('vibePromptEngine.showSidebar', () => {
    showSidebarPanel(context);
  });

  const newPromptCmd = vscode.commands.registerCommand('vibePromptEngine.newPrompt', () => {
    if (sidebarPanel) {
      sidebarPanel.webview.postMessage({ command: 'reset' });
    } else {
      showSidebarPanel(context);
    }
  });

  context.subscriptions.push(enhanceCmd, sidebarCmd, newPromptCmd);

  // Auto-open sidebar
  // Register the WebviewViewProvider for the contributed view
  try { registerSidebarProvider(context); } catch (e) { /* ignore */ }
  showSidebarPanel(context);
}

function registerSidebarProvider(context) {
  const provider = {
    resolveWebviewView(webviewView) {
      sidebarView = webviewView;
      webviewView.webview.options = { enableScripts: true };
      webviewView.webview.html = getSidebarHtml(context);

      // Load history
      const history = context.globalState.get('vibeHistory') || [];
      setTimeout(() => {
        try { webviewView.webview.postMessage({ command: 'loadHistory', history }); } catch (e) {}
      }, 600);

      webviewView.webview.onDidReceiveMessage(async (msg) => {
        await handleWebviewMessage(msg, context);
      }, undefined, context.subscriptions);

      webviewView.onDidDispose(() => { sidebarView = null; }, null, context.subscriptions);
    }
  };

  context.subscriptions.push(vscode.window.registerWebviewViewProvider('vibePromptEngine.sidebar', provider));
}

// =====================================================
//  ENHANCE SELECTED TEXT
// =====================================================
async function enhanceSelectedPrompt(context) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Vibe: No active editor found.');
    return;
  }

  const selected = editor.document.getText(editor.selection).trim();
  if (!selected) {
    vscode.window.showWarningMessage('Vibe: Select a prompt first, then run Enhance.');
    return;
  }

  currentPrompt = selected;

  if (!sidebarPanel && !sidebarView) {
    showSidebarPanel(context);
    await sleep(500);
  }

  postToSidebar({ command: 'setPrompt', prompt: selected });
  await runAnalysisPipeline(selected, context);
}

// =====================================================
//  SIDEBAR PANEL
// =====================================================
function showSidebarPanel(context) {
  // If a contributed sidebar view exists, reveal the activity bar container first
  if (sidebarView) {
    try { vscode.commands.executeCommand('workbench.view.extension.vibePromptEngine'); } catch (e) {}
    return;
  }

  if (sidebarPanel) {
    sidebarPanel.reveal(vscode.ViewColumn.Two);
    return;
  }

  // Fallback: create a WebviewPanel (existing behavior)
  sidebarPanel = vscode.window.createWebviewPanel(
    'vibePromptEngine',
    'Vibe Prompt Engine',
    vscode.ViewColumn.Two,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  sidebarPanel.webview.html = getSidebarHtml(context);

  // Load history from global state
  const history = context.globalState.get('vibeHistory') || [];
  setTimeout(() => { postToSidebar({ command: 'loadHistory', history }); }, 600);

  // Handle messages from webview (panel)
  sidebarPanel.webview.onDidReceiveMessage(async (msg) => {
    await handleWebviewMessage(msg, context);
  }, undefined, context.subscriptions);

  sidebarPanel.onDidDispose(() => { sidebarPanel = null; }, null, context.subscriptions);
}

// =====================================================
//  ANALYSIS PIPELINE
// =====================================================
async function runAnalysisPipeline(prompt, context) {
  const backendUrl = getBackendUrl(context);
  postToSidebar({ command: 'analysisStart' });

  try {
    const response = await axios.post(`${backendUrl}/api/analyze`, { prompt }, { timeout: 30000 });
    currentAnalysis = response.data;
    postToSidebar({ command: 'analysisResult', data: currentAnalysis });
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Unknown error';
    postToSidebar({ command: 'analysisError', message: msg });
    vscode.window.showErrorMessage(`Vibe: Analysis failed — ${msg}`);
  }
}

// =====================================================
//  BUILD PIPELINE
// =====================================================
async function runBuildPipeline(prompt, selections, intent, ctx, context) {
  const backendUrl = getBackendUrl(context);
  postToSidebar({ command: 'buildStart' });

  try {
    const response = await axios.post(`${backendUrl}/api/build`, {
      prompt,
      selections,
      intent: intent || currentAnalysis?.intent,
      context: ctx || currentAnalysis?.context,
    }, { timeout: 60000 });

    currentEnhancedPrompt = response.data.enhanced_prompt;

    // Save to history
    const history = context.globalState.get('vibeHistory') || [];
    history.unshift({
      id: Date.now().toString(),
      prompt,
      enhanced_prompt: currentEnhancedPrompt,
      selections,
      created_at: new Date().toISOString(),
      is_favorite: false,
      word_count: currentEnhancedPrompt.split(/\s+/).length,
    });
    if (history.length > 50) history.pop();
    context.globalState.update('vibeHistory', history);

    postToSidebar({ command: 'buildResult', data: response.data, history });

  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Unknown error';
    postToSidebar({ command: 'buildError', message: msg });
    vscode.window.showErrorMessage(`Vibe: Build failed — ${msg}`);
  }
}

// =====================================================
//  INSERT INTO EDITOR
// =====================================================
async function insertPromptIntoEditor(prompt) {
  if (!prompt) return;

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const pos = editor.selection.active;
    await editor.edit(edit => {
      edit.insert(pos, '\n\n' + prompt + '\n\n');
    });
    vscode.window.showInformationMessage('Vibe: Prompt inserted into editor!');
  } else {
    // Open new doc
    const doc = await vscode.workspace.openTextDocument({ content: prompt, language: 'markdown' });
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    vscode.window.showInformationMessage('Vibe: Prompt opened in new document!');
  }
}

// =====================================================
//  PROJECT CONTEXT AUTO-DETECTION
// =====================================================
async function detectProjectContext() {
  const ctx = { projectName: '', techStack: [], projectType: '' };

  try {
    const pkgFiles = await vscode.workspace.findFiles('package.json', '**/node_modules/**', 1);
    if (pkgFiles.length > 0) {
      const doc = await vscode.workspace.openTextDocument(pkgFiles[0]);
      const pkg = JSON.parse(doc.getText());
      ctx.projectName = pkg.name || '';
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const depKeys = Object.keys(deps);
      if (depKeys.includes('next')) ctx.techStack.push('Next.js');
      if (depKeys.includes('react')) ctx.techStack.push('React');
      if (depKeys.includes('vue')) ctx.techStack.push('Vue');
      if (depKeys.includes('svelte')) ctx.techStack.push('Svelte');
      if (depKeys.includes('tailwindcss')) ctx.techStack.push('Tailwind CSS');
      if (depKeys.includes('prisma')) ctx.techStack.push('Prisma');
      if (depKeys.includes('express')) ctx.techStack.push('Express');
      ctx.projectType = depKeys.includes('next') ? 'Next.js App' : depKeys.includes('express') ? 'API / Backend' : 'Web App';
    }

    // Check for Python
    const reqFiles = await vscode.workspace.findFiles('requirements.txt', null, 1);
    if (reqFiles.length > 0) {
      ctx.techStack.push('Python');
      const doc = await vscode.workspace.openTextDocument(reqFiles[0]);
      const text = doc.getText();
      if (text.includes('fastapi')) ctx.techStack.push('FastAPI');
      if (text.includes('django')) ctx.techStack.push('Django');
      if (text.includes('flask')) ctx.techStack.push('Flask');
      ctx.projectType = ctx.projectType || 'Python Backend';
    }
  } catch (e) {
    console.warn('Context detection error:', e);
  }

  return ctx;
}

// =====================================================
//  SIDEBAR WEBVIEW HTML
// =====================================================
function getSidebarHtml(context) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Vibe Prompt Engine</title>
  <style>
    /* VS Code specific resets and fonts */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family, 'Inter', sans-serif);
      background: var(--vscode-editor-background, #0d0d1e);
      color: var(--vscode-foreground, #ccccee);
      font-size: 13px;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    /* Core Palette matching the diagram */
    :root {
      --bg-dark: #0d0d1e;
      --blue-bg: rgba(26, 140, 255, 0.1);
      --blue-border: rgba(26, 140, 255, 0.25);
      --blue-text: #64b5f6;
      --green-bg: rgba(0, 204, 136, 0.1);
      --green-border: rgba(0, 204, 136, 0.25);
      --green-text: #00cc88;
      --label-text: #5555aa;
      --btn-solid: #1a8cff;
      --nav-text: #7777aa;
      --nav-hover: #aaaadd;
    }

    /* Header */
    .ext-header {
      background: var(--blue-bg);
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 700;
      color: var(--blue-text);
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid var(--blue-border);
      flex-shrink: 0;
    }

    /* Main Container */
    .ext-body {
      padding: 14px;
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Views */
    .view-panel { display: none; }
    .view-panel.active { display: block; }

    /* Step Rows */
    .ext-step-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }
    .ext-step-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--label-text);
    }
    
    /* Input Area */
    .prompt-textarea {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      padding: 8px 10px;
      font-size: 12px;
      color: #aaaadd;
      font-family: var(--vscode-editor-font-family, monospace);
      width: 100%;
      height: 60px;
      resize: vertical;
      outline: none;
    }
    .prompt-textarea:focus { border-color: var(--blue-text); }
    .analyze-btn {
      align-self: flex-start;
      background: var(--blue-bg);
      border: 1px solid var(--blue-border);
      color: var(--blue-text);
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      font-weight: 600;
    }
    .analyze-btn:hover { background: rgba(26,140,255,0.2); }

    /* Badges */
    .ext-step-badge {
      background: var(--blue-bg);
      border: 1px solid var(--blue-border);
      border-radius: 4px;
      padding: 7px 10px;
      font-size: 11px;
      color: var(--blue-text);
      display: inline-block;
    }
    .ext-step-ready {
      background: var(--green-bg);
      border: 1px solid var(--green-border);
      border-radius: 4px;
      padding: 7px 10px;
      font-size: 11px;
      color: var(--green-text);
      display: inline-block;
    }

    /* Questions / Selections UI */
    .suggestions-container {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 6px;
      padding: 10px;
    }
    .select-row {
      margin-bottom: 10px;
    }
    .select-label {
      font-size: 11px;
      color: #9999bb;
      margin-bottom: 5px;
    }
    .select-box {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(26,140,255,0.4);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      color: #90caf9;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .opt-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #aaaadd;
      text-align: left;
      padding: 4px 6px;
      border-radius: 3px;
      cursor: pointer;
    }
    .opt-btn:hover { background: rgba(255,255,255,0.05); }
    .opt-btn.selected {
      background: var(--blue-bg);
      border-color: var(--blue-border);
      color: var(--blue-text);
    }
    .continue-btn {
      width: 100%;
      background: var(--btn-solid);
      border: none;
      border-radius: 4px;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 8px;
      cursor: pointer;
      margin-top: 5px;
    }
    .continue-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Final Prompt Box */
    .final-prompt-box {
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(168,85,247,0.3);
      border-radius: 4px;
      padding: 10px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      color: #ccccee;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
    }

    /* Buttons Row */
    .ext-sidebar-btns {
      display: flex;
      gap: 8px;
      margin-top: 4px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .ext-btn {
      flex: 1;
      border: none;
      border-radius: 4px;
      padding: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .ext-btn-copy {
      background: rgba(255,255,255,0.05);
      color: #ccccee;
      border: 1px solid rgba(255,255,255,0.15);
    }
    .ext-btn-copy:hover { background: rgba(255,255,255,0.1); }
    .ext-btn-send {
      background: var(--btn-solid);
      color: #fff;
    }
    .ext-btn-send:hover { opacity: 0.9; }

    /* Navigation Items */
    .ext-nav-items {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ext-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 12px;
      color: var(--nav-text);
      cursor: pointer;
      transition: background 0.15s;
    }
    .ext-nav-item:hover {
      background: rgba(255,255,255,0.05);
      color: var(--nav-hover);
    }
    .ext-nav-icon { font-size: 14px; }
    .ext-nav-desc { margin-left: auto; font-size: 10px; opacity: 0.4; }

    /* Sub Views (History, Settings, Context) */
    .sub-view-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      color: var(--blue-text);
      font-weight: 600;
      cursor: pointer;
    }
    .back-btn { font-size: 16px; }
    
    .settings-input {
      width: 100%;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      color: #ccccee;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    
    .history-item {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 8px;
      cursor: pointer;
    }
    .history-item:hover { border-color: var(--blue-border); }

    /* Spinner */
    .spinner {
      display: inline-block;
      width: 14px; height: 14px;
      border: 2px solid rgba(26,140,255,0.3);
      border-top-color: var(--btn-solid);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

  </style>
</head>
<body>

  <div class="ext-header">
    <span>⚡</span> Vibe Prompt Engine
  </div>

  <div class="ext-body">

    <!-- MAIN WORKFLOW VIEW -->
    <div id="view-main" class="view-panel active">
      
      <!-- STEP 1 -->
      <div class="ext-step-row">
        <div class="ext-step-label">1 Raw Prompt</div>
        <textarea class="prompt-textarea" id="promptInput" placeholder="e.g. make dashboard"></textarea>
        <button class="analyze-btn" id="analyzeBtn" onclick="analyze()">⚡ Analyze</button>
      </div>

      <!-- STEP 2 -->
      <div class="ext-step-row">
        <div class="ext-step-label">2 Suggestions</div>
        
        <!-- Waiting state -->
        <div id="step2-waiting" class="ext-step-badge">Waiting for prompt...</div>
        <!-- Loading state -->
        <div id="step2-loading" class="ext-step-badge" style="display:none; gap:8px; align-items:center;">
          Analyzing... <span class="spinner"></span>
        </div>
        
        <!-- Active state (Questions) -->
        <div id="step2-active" class="suggestions-container" style="display:none;">
          <div style="font-size:11px; color:#64b5f6; margin-bottom:10px; font-weight:600;">Answer a few questions</div>
          <div id="questionsContainer"></div>
          <button class="continue-btn" id="buildBtn" onclick="build()" disabled>Continue to Build</button>
        </div>
      </div>

      <!-- STEP 3 -->
      <div class="ext-step-row">
        <div class="ext-step-label">3 Final Prompt</div>
        
        <!-- Waiting state -->
        <div id="step3-waiting" class="ext-step-badge" style="color:var(--nav-text); border-color:rgba(255,255,255,0.1); background:rgba(255,255,255,0.02)">
          Not ready
        </div>
        <!-- Loading state -->
        <div id="step3-loading" class="ext-step-badge" style="display:none; gap:8px; align-items:center;">
          Building... <span class="spinner"></span>
        </div>
        
        <!-- Active state (Final prompt) -->
        <div id="step3-active" style="display:none;">
          <div class="ext-step-ready" style="margin-bottom:8px; width:100%;">✅ Ready to send</div>
          <div class="final-prompt-box" id="resultBox"></div>
        </div>
      </div>

      <!-- Buttons -->
      <div class="ext-sidebar-btns">
        <button class="ext-btn ext-btn-copy" onclick="copyPrompt()">📋 Copy Prompt</button>
        <button class="ext-btn ext-btn-send" onclick="sendToAI()">🚀 Send to AI Tool</button>
      </div>

      <!-- Navigation List -->
      <div class="ext-nav-items">
        <div class="ext-nav-item" onclick="showView('history')">
          <span class="ext-nav-icon">🕐</span> Prompt History <span class="ext-nav-desc">Previous prompts</span>
        </div>
        <div class="ext-nav-item" onclick="showView('templates')">
          <span class="ext-nav-icon">📄</span> Templates <span class="ext-nav-desc">Pre-built prompts</span>
        </div>
        <div class="ext-nav-item" onclick="showView('context')">
          <span class="ext-nav-icon">🔍</span> Project Context <span class="ext-nav-desc">Auto-detect stack</span>
        </div>
        <div class="ext-nav-item" onclick="showView('settings')">
          <span class="ext-nav-icon">⚙️</span> Settings <span class="ext-nav-desc">Configure</span>
        </div>
      </div>

    </div>

    <!-- HISTORY VIEW -->
    <div id="view-history" class="view-panel">
      <div class="sub-view-header" onclick="showView('main')"><span class="back-btn">‹</span> Back to Workflow</div>
      <div class="ext-step-label" style="margin-bottom:10px">Prompt History</div>
      <div id="historyList" style="font-size:12px; color:var(--nav-text);">No history yet.</div>
    </div>

    <!-- TEMPLATES VIEW -->
    <div id="view-templates" class="view-panel">
      <div class="sub-view-header" onclick="showView('main')"><span class="back-btn">‹</span> Back to Workflow</div>
      <div class="ext-step-label" style="margin-bottom:10px">Templates</div>
      <div id="templatesList"></div>
    </div>

    <!-- CONTEXT VIEW -->
    <div id="view-context" class="view-panel">
      <div class="sub-view-header" onclick="showView('main')"><span class="back-btn">‹</span> Back to Workflow</div>
      <div class="ext-step-label" style="margin-bottom:10px">Project Context</div>
      <button class="ext-btn ext-btn-copy" style="width:100%; margin-bottom:12px;" onclick="detectContext()">🔍 Auto-Detect Stack</button>
      <div style="font-size:11px; margin-bottom:5px;">Project Name</div>
      <input class="settings-input" id="ctxName" type="text" />
      <div style="font-size:11px; margin-bottom:5px;">Tech Stack</div>
      <input class="settings-input" id="ctxStack" type="text" />
      <button class="ext-btn ext-btn-send" style="width:100%;" onclick="showView('main')">💾 Save Context</button>
    </div>

    <!-- SETTINGS VIEW -->
    <div id="view-settings" class="view-panel">
      <div class="sub-view-header" onclick="showView('main')"><span class="back-btn">‹</span> Back to Workflow</div>
      <div class="ext-step-label" style="margin-bottom:10px">Settings</div>
      <div style="font-size:11px; margin-bottom:5px;">Backend URL</div>
      <input class="settings-input" id="settingUrl" type="text" value="http://localhost:8000" />
      <button class="ext-btn ext-btn-send" style="width:100%;" onclick="saveSettings()">💾 Save Settings</button>
      <div id="settingsMsg" style="color:var(--green-text); font-size:11px; margin-top:8px; display:none;">✅ Saved</div>
    </div>

  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    let state = {
      prompt: '',
      analysis: null,
      selections: {},
      totalQ: 0,
      history: []
    };

    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.command) {
        case 'setPrompt':
          document.getElementById('promptInput').value = msg.prompt;
          break;
        case 'analysisStart':
          document.getElementById('step2-waiting').style.display = 'none';
          document.getElementById('step2-loading').style.display = 'flex';
          document.getElementById('step2-active').style.display = 'none';
          break;
        case 'analysisResult':
          state.analysis = msg.data;
          renderQuestions(msg.data.suggestions?.questions || []);
          break;
        case 'analysisError':
          document.getElementById('step2-loading').style.display = 'none';
          document.getElementById('step2-waiting').style.display = 'block';
          alert('Analysis error: ' + msg.message);
          break;
        case 'buildStart':
          document.getElementById('step3-waiting').style.display = 'none';
          document.getElementById('step3-active').style.display = 'none';
          document.getElementById('step3-loading').style.display = 'flex';
          break;
        case 'buildResult':
          document.getElementById('step3-loading').style.display = 'none';
          document.getElementById('step3-active').style.display = 'block';
          document.getElementById('resultBox').textContent = msg.data.enhanced_prompt;
          if (msg.history) updateHistory(msg.history);
          break;
        case 'buildError':
          document.getElementById('step3-loading').style.display = 'none';
          document.getElementById('step3-waiting').style.display = 'block';
          alert('Build error: ' + msg.message);
          break;
        case 'loadHistory':
          updateHistory(msg.history);
          break;
        case 'contextDetected':
          document.getElementById('ctxName').value = msg.context.projectName || '';
          document.getElementById('ctxStack').value = (msg.context.techStack || []).join(', ');
          break;
        case 'reset':
          resetUI();
          break;
      }
    });

    function showView(id) {
      document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));
      document.getElementById('view-' + id).classList.add('active');
    }

    function analyze() {
      const prompt = document.getElementById('promptInput').value.trim();
      if (!prompt) return;
      state.prompt = prompt;
      state.selections = {};
      vscode.postMessage({ command: 'analyze', prompt });
      
      // Reset step 3
      document.getElementById('step3-active').style.display = 'none';
      document.getElementById('step3-waiting').style.display = 'block';
    }

    function renderQuestions(questions) {
      document.getElementById('step2-loading').style.display = 'none';
      const container = document.getElementById('questionsContainer');
      
      if (questions.length === 0) {
        document.getElementById('step2-waiting').style.display = 'block';
        document.getElementById('step2-waiting').textContent = 'No questions needed. Ready to build!';
        document.getElementById('buildBtn').disabled = false;
        document.getElementById('step2-active').style.display = 'block';
        return;
      }

      state.totalQ = questions.length;
      container.innerHTML = questions.map((q, i) => \`
        <div class="select-row">
          <div class="select-label">\${i+1}. \${q.question}</div>
          <div class="select-box">
            \${q.options.map((opt, oi) => \`
              <button class="opt-btn" id="opt-\${i}-\${oi}" 
                onclick="selectOpt(\${i}, \${oi}, '\${opt.replace(/'/g, "\\\\'")}')"
                data-q="\${i}">
                \${opt}
              </button>
            \`).join('')}
          </div>
        </div>
      \`).join('');

      document.getElementById('step2-active').style.display = 'block';
      updateProgress();
    }

    function selectOpt(qi, oi, val) {
      document.querySelectorAll(\`[data-q="\${qi}"]\`).forEach(b => b.classList.remove('selected'));
      document.getElementById(\`opt-\${qi}-\${oi}\`).classList.add('selected');
      const q = state.analysis.suggestions.questions[qi];
      state.selections[q.question] = val;
      updateProgress();
    }

    function updateProgress() {
      const answered = Object.keys(state.selections).length;
      document.getElementById('buildBtn').disabled = answered < state.totalQ;
      document.getElementById('buildBtn').textContent = answered < state.totalQ 
        ? \`Continue to Build (\${answered}/\${state.totalQ})\` 
        : '🚀 Continue to Build';
    }

    function build() {
      vscode.postMessage({
        command: 'build',
        prompt: state.prompt,
        selections: state.selections,
        intent: state.analysis?.intent,
        context: state.analysis?.context,
      });
    }

    function copyPrompt() { vscode.postMessage({ command: 'copyPrompt' }); }
    function sendToAI() { vscode.postMessage({ command: 'sendToAI' }); }
    
    function resetUI() {
      document.getElementById('promptInput').value = '';
      document.getElementById('step2-active').style.display = 'none';
      document.getElementById('step2-waiting').style.display = 'block';
      document.getElementById('step2-waiting').textContent = 'Waiting for prompt...';
      document.getElementById('step3-active').style.display = 'none';
      document.getElementById('step3-waiting').style.display = 'block';
      state = { prompt: '', analysis: null, selections: {}, totalQ: 0, history: state.history };
    }

    // Settings
    function saveSettings() {
      const url = document.getElementById('settingUrl').value;
      vscode.postMessage({ command: 'saveSettings', backendUrl: url });
      document.getElementById('settingsMsg').style.display = 'block';
      setTimeout(() => document.getElementById('settingsMsg').style.display = 'none', 2000);
    }

    // Context
    function detectContext() {
      vscode.postMessage({ command: 'detectContext' });
    }

    // History
    function updateHistory(history) {
      state.history = history || [];
      const list = document.getElementById('historyList');
      if (history.length === 0) { list.innerHTML = 'No history yet.'; return; }
      
      list.innerHTML = history.map(h => \`
        <div class="history-item" onclick="loadHist('\${h.id}')">
          <div style="font-family:monospace; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">\${h.prompt}</div>
          <div style="font-size:10px; opacity:0.5;">\${new Date(h.created_at).toLocaleTimeString()}</div>
        </div>
      \`).join('');
    }
    
    function loadHist(id) {
      const h = state.history.find(x => x.id === id);
      if (h) {
        document.getElementById('promptInput').value = h.prompt;
        document.getElementById('resultBox').textContent = h.enhanced_prompt;
        document.getElementById('step3-waiting').style.display = 'none';
        document.getElementById('step3-active').style.display = 'block';
        showView('main');
      }
    }

    // Templates
    const templates = [
      { name: 'Dashboard', p: 'make dashboard' },
      { name: 'Auth System', p: 'create login and signup system with JWT auth' },
      { name: 'Landing Page', p: 'create a modern SaaS landing page' },
      { name: 'REST API', p: 'build a REST API with CRUD operations' }
    ];
    document.getElementById('templatesList').innerHTML = templates.map(t => \`
      <div class="history-item" onclick="useTpl('\${t.p}')">
        <div style="font-weight:600; margin-bottom:4px;">\${t.name}</div>
        <div style="font-family:monospace; font-size:10px; opacity:0.6;">\${t.p}</div>
      </div>
    \`).join('');

    function useTpl(p) {
      document.getElementById('promptInput').value = p;
      showView('main');
      analyze();
    }
  </script>
</body>
</html>`;
}

// =====================================================
//  BUILT-IN TEMPLATES (for the webview)
// =====================================================
function getBuiltInTemplates() {
  return [
    { icon: '📊', name: 'Dashboard', prompt: 'make dashboard', description: 'Analytics dashboard with charts and KPIs' },
    { icon: '🔐', name: 'Auth System', prompt: 'create login and signup system with JWT auth', description: 'Full authentication flow' },
    { icon: '🚀', name: 'Landing Page', prompt: 'create a modern SaaS landing page', description: 'Hero, features, pricing, CTA' },
    { icon: '⚡', name: 'REST API', prompt: 'build a REST API with CRUD operations', description: 'Full CRUD with validation' },
    { icon: '📋', name: 'Data Table', prompt: 'create a data table with sorting filtering and pagination', description: 'Interactive table with management' },
    { icon: '💬', name: 'Chat UI', prompt: 'build a chat interface with message bubbles and real-time updates', description: 'Modern chat with streaming' },
    { icon: '🛒', name: 'Product Page', prompt: 'create an ecommerce product listing page with cart', description: 'Product cards, filters, cart' },
    { icon: '⚙️', name: 'Settings Page', prompt: 'create a user settings and profile page', description: 'Profile, preferences, security tabs' },
  ];
}

// ---- Utility ----
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function deactivate() {
  console.log('Vibe Prompt Engine deactivated');
}

module.exports = { activate, deactivate };
