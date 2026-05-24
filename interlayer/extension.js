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
      context.globalState.update('vibeTheme', msg.theme);
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
  const theme = context.globalState.get('vibeTheme') || 'light';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Vibe Prompt Engine</title>
  <style>
    /* ── Kinetic Precision Design System ── */
    :root {
      --red:        #f06260;
      --red-hover:  #d95351;
      --red-glow:   rgba(240,98,96,0.12);
      --bg:         #fafafa;
      --surface:    #ffffff;
      --surface-2:  #f4f4f5;
      --border:     #e4e4e7;
      --text:       #18181b;
      --text-muted: #71717a;
      --text-dim:   #a1a1aa;
      --mono:       'JetBrains Mono', 'Fira Code', Consolas, monospace;
      --sans:       -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    body.forced-dark {
      --bg:         #09090b;
      --surface:    #18181b;
      --surface-2:  #27272a;
      --border:     #3f3f46;
      --text:       #fafafa;
      --text-muted: #a1a1aa;
      --text-dim:   #71717a;
      --red-glow:   rgba(240,98,96,0.18);
    }
    body.vscode-light  { /* already light */ }
    body.vscode-dark   {
      --bg:         #09090b;
      --surface:    #18181b;
      --surface-2:  #27272a;
      --border:     #3f3f46;
      --text:       #fafafa;
      --text-muted: #a1a1aa;
      --text-dim:   #71717a;
      --red-glow:   rgba(240,98,96,0.18);
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    body {
      font-family: var(--sans);
      background: var(--bg);
      color: var(--text);
      font-size: 12px;
      line-height: 1.5;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--red); }

    /* ── Header ── */
    .ext-header {
      background: var(--surface);
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .header-logo {
      width: 28px; height: 28px;
      background: var(--text);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .header-logo svg { width: 16px; height: 16px; }
    .header-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text);
    }
    .header-status {
      display: flex; align-items: center; gap: 4px;
      font-size: 9px;
      font-family: var(--mono);
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* ── Body ── */
    .ext-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .view-panel { display: none; }
    .view-panel.active { display: flex; flex-direction: column; gap: 14px; }

    /* ── Step Cards ── */
    .step-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .step-card:focus-within {
      border-color: var(--red);
      box-shadow: 0 0 0 3px var(--red-glow);
    }
    .step-card-header {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--surface-2);
    }
    .step-badge {
      width: 24px; height: 24px;
      border-radius: 6px;
      background: var(--text);
      color: var(--surface);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .step-badge.active-badge { background: var(--red); }
    .step-title-wrap { display: flex; flex-direction: column; }
    .step-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .step-desc {
      font-size: 10px;
      color: var(--text-muted);
      font-family: var(--mono);
      margin-top: 1px;
    }
    .step-card-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }

    /* ── Input / Textarea ── */
    .prompt-textarea {
      width: 100%;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 12px;
      font-family: var(--mono);
      color: var(--text);
      min-height: 80px;
      resize: vertical;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      letter-spacing: 0;
    }
    .prompt-textarea::placeholder { color: var(--text-dim); }
    .prompt-textarea:focus {
      border-color: var(--red);
      box-shadow: 0 0 0 3px var(--red-glow);
      background: var(--surface);
    }

    /* ── Buttons ── */
    .btn-primary {
      width: 100%;
      background: var(--red);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 9px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .btn-primary:hover { background: var(--red-hover); box-shadow: 0 4px 12px var(--red-glow); }
    .btn-primary:active { transform: scale(0.98); }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

    .btn-secondary {
      flex: 1;
      background: var(--surface-2);
      color: var(--text);
      font-size: 11px;
      font-weight: 600;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      transition: background 0.15s, border-color 0.15s;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .btn-secondary:hover { background: var(--border); }

    .btn-group { display: flex; gap: 8px; }

    /* ── Status Badges ── */
    .status-badge {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 11px;
      color: var(--text-muted);
      text-align: center;
      font-family: var(--mono);
    }
    .status-badge.ready {
      border-color: var(--red);
      color: var(--red);
      background: var(--red-glow);
      font-weight: 700;
    }

    /* ── Spinner ── */
    .loading-row {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px;
      font-size: 11px;
      color: var(--text-muted);
      font-family: var(--mono);
    }
    .spinner {
      width: 13px; height: 13px;
      border: 2px solid var(--border);
      border-top-color: var(--red);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* ── Form Elements ── */
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-label {
      font-size: 10px;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .select-wrapper { position: relative; }
    .select-wrapper::after {
      content: '▼';
      font-size: 7px;
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-dim);
      pointer-events: none;
    }
    .select-input, .settings-input {
      width: 100%;
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 12px;
      font-family: var(--mono);
      padding: 8px 28px 8px 10px;
      border-radius: 6px;
      outline: none;
      appearance: none;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .select-input:focus, .settings-input:focus {
      border-color: var(--red);
      box-shadow: 0 0 0 3px var(--red-glow);
    }

    /* ── Terminal Output (Step 3) ── */
    .terminal-wrap {
      background: var(--text);
      border-radius: 8px;
      overflow: hidden;
    }
    .terminal-bar {
      height: 28px;
      background: rgba(255,255,255,0.06);
      display: flex;
      align-items: center;
      padding: 0 12px;
      gap: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .terminal-dots { display: flex; gap: 4px; }
    .terminal-dot { width: 8px; height: 8px; border-radius: 50%; }
    .terminal-label {
      flex: 1;
      text-align: center;
      font-size: 9px;
      font-family: var(--mono);
      color: rgba(255,255,255,0.3);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .terminal-body {
      padding: 12px;
      min-height: 80px;
      font-family: var(--mono);
      font-size: 11px;
      color: rgba(255,255,255,0.8);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 180px;
      overflow-y: auto;
      line-height: 1.6;
    }
    .terminal-idle {
      color: rgba(255,255,255,0.3);
      font-style: italic;
      font-size: 11px;
    }
    .terminal-success-label {
      color: var(--red);
      font-weight: 700;
      font-size: 10px;
      margin-bottom: 6px;
      display: block;
    }

    /* ── Nav Items ── */
    .nav-divider {
      border-top: 1px solid var(--border);
      margin-top: 4px;
      padding-top: 10px;
    }
    .ext-nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      color: var(--text);
      font-size: 11px;
      font-weight: 600;
      transition: background 0.15s;
      border: 1px solid transparent;
    }
    .ext-nav-item:hover {
      background: var(--surface-2);
      border-color: var(--border);
    }
    .ext-nav-desc { font-size: 10px; color: var(--text-dim); font-weight: 400; }

    /* ── Sub Views ── */
    .sub-view-header {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 0 12px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      transition: color 0.15s;
    }
    .sub-view-header:hover { color: var(--text); }
    .sub-view-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 12px;
    }

    /* ── History / Template Items ── */
    .list-item {
      padding: 10px 12px;
      border: 1px solid var(--border);
      margin-bottom: 8px;
      border-radius: 8px;
      background: var(--surface);
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .list-item:hover {
      border-color: var(--red);
      box-shadow: 0 0 0 2px var(--red-glow);
    }
    .list-item-name { font-weight: 700; margin-bottom: 4px; font-size: 12px; color: var(--text); }
    .list-item-text {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .list-item-time { font-size: 9px; color: var(--text-dim); margin-top: 4px; }

    /* ── Footer ── */
    .ext-footer {
      flex-shrink: 0;
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding: 6px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      font-family: var(--mono);
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* ── Settings toggle ── */
    .settings-msg {
      color: var(--red);
      font-size: 11px;
      text-align: center;
      display: none;
      margin-top: 6px;
      font-family: var(--mono);
    }
  </style>
</head>
<body class="${theme === 'light' ? 'forced-light' : theme === 'dark' ? 'forced-dark' : ''}">

  <!-- Header -->
  <div class="ext-header">
    <div class="header-left">
      <div class="header-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="#f06260" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>
      <div>
        <div class="header-title">Vibe Prompt Engine</div>
      </div>
    </div>
    <div class="header-status">
      <div class="status-dot"></div>
      <span id="headerStatus">READY</span>
    </div>
  </div>

  <!-- Body -->
  <div class="ext-body">

    <!-- ── MAIN VIEW ── -->
    <div id="view-main" class="view-panel active">

      <!-- STEP 01: Raw Prompt -->
      <div class="step-card">
        <div class="step-card-header">
          <div class="step-badge" id="badge1">01</div>
          <div class="step-title-wrap">
            <div class="step-title">Raw Prompt</div>
            <div class="step-desc">INPUT_STREAM // TTY_READY</div>
          </div>
        </div>
        <div class="step-card-body">
          <textarea class="prompt-textarea" id="promptInput" placeholder="e.g. build a high-performance dashboard with real-time charts..."></textarea>
          <button class="btn-primary" id="analyzeBtn" onclick="analyze()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Analyze Intent
          </button>
        </div>
      </div>

      <!-- STEP 02: User Selection -->
      <div class="step-card">
        <div class="step-card-header">
          <div class="step-badge" id="badge2">02</div>
          <div class="step-title-wrap">
            <div class="step-title">User Selection</div>
            <div class="step-desc">PARAM_DETERMINATION</div>
          </div>
        </div>
        <div class="step-card-body">
          <div id="step2-waiting" class="status-badge">Waiting for prompt analysis...</div>
          <div id="step2-loading" class="loading-row" style="display:none;">
            <div class="spinner"></div> Analyzing intent...
          </div>
          <div id="step2-active" style="display:none; display:flex; flex-direction:column; gap:10px;">
            <div id="questionsContainer" style="display:flex; flex-direction:column; gap:10px;"></div>
            <button class="btn-primary" id="buildBtn" onclick="build()" disabled>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg>
              Continue to Build
            </button>
          </div>
        </div>
      </div>

      <!-- STEP 03: Final Prompt -->
      <div class="step-card">
        <div class="step-card-header">
          <div class="step-badge" id="badge3">03</div>
          <div class="step-title-wrap">
            <div class="step-title">Final Prompt</div>
            <div class="step-desc">TERMINAL_OUTPUT_READY</div>
          </div>
        </div>
        <div class="step-card-body">
          <div id="step3-waiting">
            <div class="terminal-wrap">
              <div class="terminal-bar">
                <div class="terminal-dots">
                  <div class="terminal-dot" style="background:rgba(255,255,255,0.15)"></div>
                  <div class="terminal-dot" style="background:rgba(255,255,255,0.1)"></div>
                  <div class="terminal-dot" style="background:rgba(255,255,255,0.1)"></div>
                </div>
                <div class="terminal-label" id="terminalStatus">STDOUT: IDLE</div>
              </div>
              <div class="terminal-body">
                <span class="terminal-idle">&gt; Awaiting selection completion...</span>
              </div>
            </div>
          </div>
          <div id="step3-loading" class="loading-row" style="display:none;">
            <div class="spinner"></div> Building enhanced prompt...
          </div>
          <div id="step3-active" style="display:none;">
            <div class="terminal-wrap">
              <div class="terminal-bar">
                <div class="terminal-dots">
                  <div class="terminal-dot" style="background:#ef4444"></div>
                  <div class="terminal-dot" style="background:#eab308"></div>
                  <div class="terminal-dot" style="background:#22c55e"></div>
                </div>
                <div class="terminal-label">STDOUT: READY</div>
              </div>
              <div class="terminal-body">
                <span class="terminal-success-label">[SUCCESS] COMPILATION COMPLETE</span>
                <div id="resultBox"></div>
              </div>
            </div>
            <div class="btn-group" style="margin-top:8px;">
              <button class="btn-secondary" onclick="copyPrompt()">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                Copy
              </button>
              <button class="btn-secondary" onclick="sendToAI()">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
                Send to AI
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="nav-divider">
        <div class="ext-nav-item" onclick="showView('history')">
          Prompt History <span class="ext-nav-desc">Previous prompts</span>
        </div>
        <div class="ext-nav-item" onclick="showView('templates')">
          Templates <span class="ext-nav-desc">Pre-built prompts</span>
        </div>
        <div class="ext-nav-item" onclick="showView('context')">
          Project Context <span class="ext-nav-desc">Auto-detect stack</span>
        </div>
        <div class="ext-nav-item" onclick="showView('settings')">
          Settings <span class="ext-nav-desc">Configure</span>
        </div>
      </div>

    </div><!-- end view-main -->

    <!-- ── HISTORY VIEW ── -->
    <div id="view-history" class="view-panel">
      <div class="sub-view-header" onclick="showView('main')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to Workflow
      </div>
      <div class="sub-view-title">Prompt History</div>
      <div id="historyList" style="font-size:12px; color:var(--text-muted);">No history yet.</div>
    </div>

    <!-- ── TEMPLATES VIEW ── -->
    <div id="view-templates" class="view-panel">
      <div class="sub-view-header" onclick="showView('main')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to Workflow
      </div>
      <div class="sub-view-title">Templates</div>
      <div id="templatesList"></div>
    </div>

    <!-- ── CONTEXT VIEW ── -->
    <div id="view-context" class="view-panel">
      <div class="sub-view-header" onclick="showView('main')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to Workflow
      </div>
      <div class="sub-view-title">Project Context</div>
      <button class="btn-secondary" style="width:100%; margin-bottom:14px;" onclick="detectContext()">Auto-Detect Stack</button>
      <div class="form-group" style="margin-bottom:10px;">
        <label class="form-label">Project Name</label>
        <input class="settings-input" id="ctxName" type="text" placeholder="my-project" />
      </div>
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">Tech Stack</label>
        <input class="settings-input" id="ctxStack" type="text" placeholder="React, TypeScript, Tailwind..." />
      </div>
      <button class="btn-primary" onclick="showView('main')">Save Context</button>
    </div>

    <!-- ── SETTINGS VIEW ── -->
    <div id="view-settings" class="view-panel">
      <div class="sub-view-header" onclick="showView('main')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to Workflow
      </div>
      <div class="sub-view-title">Settings</div>
      <div class="form-group" style="margin-bottom:12px;">
        <label class="form-label">Backend URL</label>
        <input class="settings-input" id="settingUrl" type="text" value="http://localhost:8000" />
      </div>
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">Theme</label>
        <div class="select-wrapper">
          <select class="select-input" id="settingTheme">
            <option value="auto" ${theme === 'auto' ? 'selected' : ''}>Auto (Match VS Code)</option>
            <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </div>
      </div>
      <button class="btn-primary" onclick="saveSettings()">Save Settings</button>
      <div class="settings-msg" id="settingsMsg">Settings saved successfully.</div>
    </div>

  </div><!-- end ext-body -->

  <!-- Footer -->
  <div class="ext-footer">
    <span>Kinetic System v1.0</span>
    <span id="footerStatus">Nominal</span>
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

    // ── Message Handler ──
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.command) {
        case 'setPrompt':
          document.getElementById('promptInput').value = msg.prompt;
          break;
        case 'analysisStart':
          setStatus('ANALYZING...');
          setStep2State('loading');
          setStep3State('waiting');
          setBadge(2, 'active');
          break;
        case 'analysisResult':
          state.analysis = msg.data;
          renderQuestions(msg.data.suggestions?.questions || []);
          setStatus('READY');
          break;
        case 'analysisError':
          setStep2State('waiting');
          setStatus('ERROR');
          setBadge(2, 'default');
          alert('Analysis error: ' + msg.message);
          break;
        case 'buildStart':
          setStatus('BUILDING...');
          setStep3State('loading');
          setBadge(3, 'active');
          break;
        case 'buildResult':
          setStep3State('result', msg.data.enhanced_prompt);
          setStatus('READY');
          setBadge(3, 'done');
          if (msg.history) updateHistory(msg.history);
          break;
        case 'buildError':
          setStep3State('waiting');
          setStatus('ERROR');
          setBadge(3, 'default');
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

    // ── State Helpers ──
    function setStatus(text) {
      document.getElementById('headerStatus').textContent = text;
      document.getElementById('footerStatus').textContent = text === 'READY' ? 'Nominal' : text;
    }

    function setBadge(num, mode) {
      const el = document.getElementById('badge' + num);
      if (!el) return;
      el.classList.toggle('active-badge', mode === 'active' || mode === 'done');
      el.style.background = mode === 'done' ? '#22c55e' : '';
    }

    function setStep2State(state) {
      document.getElementById('step2-waiting').style.display = state === 'waiting' ? 'block' : 'none';
      document.getElementById('step2-loading').style.display = state === 'loading' ? 'flex' : 'none';
      document.getElementById('step2-active').style.display = state === 'active' ? 'flex' : 'none';
    }

    function setStep3State(s, text) {
      document.getElementById('step3-waiting').style.display = s === 'waiting' ? 'block' : 'none';
      document.getElementById('step3-loading').style.display = s === 'loading' ? 'flex' : 'none';
      document.getElementById('step3-active').style.display = s === 'result' ? 'block' : 'none';
      if (s === 'result' && text) document.getElementById('resultBox').textContent = text;
    }

    // ── View Navigation ──
    function showView(id) {
      document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));
      document.getElementById('view-' + id).classList.add('active');
    }

    // ── Analyze ──
    function analyze() {
      const prompt = document.getElementById('promptInput').value.trim();
      if (!prompt) return;
      state.prompt = prompt;
      state.selections = {};
      vscode.postMessage({ command: 'analyze', prompt });
      setBadge(1, 'done');
    }

    // ── Render Questions ──
    function renderQuestions(questions) {
      const container = document.getElementById('questionsContainer');
      container.innerHTML = '';

      if (questions.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'status-badge ready';
        msg.textContent = 'No questions needed. Ready to build!';
        container.appendChild(msg);
        document.getElementById('buildBtn').disabled = false;
        setStep2State('active');
        return;
      }

      state.totalQ = questions.length;
      container.innerHTML = questions.map((q, i) => \`
        <div class="form-group">
          <label class="form-label">\${q.question}</label>
          <div class="select-wrapper">
            <select class="select-input" onchange="selectOpt(\${i}, this.value)">
              <option value="" disabled selected>-- Select an option --</option>
              \${q.options.map(opt => \`<option value="\${opt.replace(/"/g, '&quot;')}">\${opt}</option>\`).join('')}
            </select>
          </div>
        </div>
      \`).join('');

      setStep2State('active');
      updateProgress();
    }

    function selectOpt(qi, val) {
      const q = state.analysis.suggestions.questions[qi];
      state.selections[q.question] = val;
      updateProgress();
    }

    function updateProgress() {
      const answered = Object.keys(state.selections).length;
      const btn = document.getElementById('buildBtn');
      btn.disabled = answered < state.totalQ;
      btn.textContent = answered < state.totalQ
        ? \`Continue to Build (\${answered}/\${state.totalQ})\`
        : 'Continue to Build';
    }

    // ── Build ──
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
    function sendToAI()   { vscode.postMessage({ command: 'sendToAI' }); }

    // ── Reset ──
    function resetUI() {
      document.getElementById('promptInput').value = '';
      setStep2State('waiting');
      setStep3State('waiting');
      setBadge(1, 'default');
      setBadge(2, 'default');
      setBadge(3, 'default');
      setStatus('READY');
      state = { prompt: '', analysis: null, selections: {}, totalQ: 0, history: state.history };
    }

    // ── Settings ──
    function saveSettings() {
      const url   = document.getElementById('settingUrl').value;
      const theme = document.getElementById('settingTheme').value;
      vscode.postMessage({ command: 'saveSettings', backendUrl: url, theme });
      applyTheme(theme);
      const msg = document.getElementById('settingsMsg');
      msg.style.display = 'block';
      setTimeout(() => msg.style.display = 'none', 2000);
    }

    function applyTheme(theme) {
      document.body.classList.remove('forced-light', 'forced-dark');
      if (theme === 'light')      document.body.classList.add('forced-light');
      else if (theme === 'dark')  document.body.classList.add('forced-dark');
    }

    // ── Context ──
    function detectContext() {
      vscode.postMessage({ command: 'detectContext' });
    }

    // ── History ──
    function updateHistory(history) {
      state.history = history || [];
      const list = document.getElementById('historyList');
      if (!history || history.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted); font-size:11px; text-align:center; padding:20px 0;">No history yet.</div>';
        return;
      }
      list.innerHTML = history.map(h => \`
        <div class="list-item" onclick="loadHist('\${h.id}')">
          <div class="list-item-text">\${h.prompt}</div>
          <div class="list-item-time">\${new Date(h.created_at).toLocaleTimeString()}</div>
        </div>
      \`).join('');
    }

    function loadHist(id) {
      const h = state.history.find(x => x.id === id);
      if (h) {
        document.getElementById('promptInput').value = h.prompt;
        setStep3State('result', h.enhanced_prompt);
        setBadge(3, 'done');
        showView('main');
      }
    }

    // ── Templates ──
    const templates = [
      { name: 'Dashboard',    desc: 'Analytics with charts & KPIs', p: 'make a react dashboard with analytics charts and KPI cards' },
      { name: 'Auth System',  desc: 'Login / Signup with JWT',       p: 'create login and signup system with JWT auth' },
      { name: 'Landing Page', desc: 'Modern SaaS landing',           p: 'create a modern SaaS landing page with hero and pricing' },
      { name: 'REST API',     desc: 'Full CRUD API',                  p: 'build a REST API with CRUD operations and validation' },
      { name: 'Data Table',   desc: 'Sort, filter, paginate',         p: 'create a data table with sorting filtering and pagination' },
      { name: 'Chat UI',      desc: 'Real-time messaging',            p: 'build a chat interface with message bubbles and real-time updates' },
    ];

    document.getElementById('templatesList').innerHTML = templates.map(t => \`
      <div class="list-item" onclick="useTpl('\${t.p}')">
        <div class="list-item-name">\${t.name}</div>
        <div class="list-item-text">\${t.desc}</div>
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
    { icon: '', name: 'Dashboard', prompt: 'make dashboard', description: 'Analytics dashboard with charts and KPIs' },
    { icon: '', name: 'Auth System', prompt: 'create login and signup system with JWT auth', description: 'Full authentication flow' },
    { icon: '', name: 'Landing Page', prompt: 'create a modern SaaS landing page', description: 'Hero, features, pricing, CTA' },
    { icon: '', name: 'REST API', prompt: 'build a REST API with CRUD operations', description: 'Full CRUD with validation' },
    { icon: '', name: 'Data Table', prompt: 'create a data table with sorting filtering and pagination', description: 'Interactive table with management' },
    { icon: '', name: 'Chat UI', prompt: 'build a chat interface with message bubbles and real-time updates', description: 'Modern chat with streaming' },
    { icon: '', name: 'Product Page', prompt: 'create an ecommerce product listing page with cart', description: 'Product cards, filters, cart' },
    { icon: '', name: 'Settings Page', prompt: 'create a user settings and profile page', description: 'Profile, preferences, security tabs' },
  ];
}

// ---- Utility ----
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function deactivate() {
  console.log('Vibe Prompt Engine deactivated');
}

module.exports = { activate, deactivate };
