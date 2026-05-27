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
    case 'nextStage':
      currentPrompt = msg.prompt;
      await runNextStage(msg.prompt, msg.selections, msg.model, context);
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
      webviewView.webview.html = getSidebarHtml(context, webviewView.webview);

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
  await runNextStage(selected, null, null, context);
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

  sidebarPanel.webview.html = getSidebarHtml(context, sidebarPanel.webview);

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
//  STAGE PIPELINE (ADVANCED AI WORKFLOW)
// =====================================================
async function runNextStage(prompt, selections, model, context) {
  const backendUrl = getBackendUrl(context);
  postToSidebar({ command: 'stageStart' });

  try {
    const response = await axios.post(`${backendUrl}/api/next`, { prompt, selections, model }, { timeout: 300000 });
    const state = response.data;

    if (state.stage === 'final') {
      currentEnhancedPrompt = state.final_prompt;
      
      // Save to history
      const history = context.globalState.get('vibeHistory') || [];
      history.unshift({
        id: Date.now().toString(),
        prompt,
        enhanced_prompt: currentEnhancedPrompt,
        selections: state.selections,
        created_at: new Date().toISOString(),
        is_favorite: false,
        word_count: currentEnhancedPrompt.split(/\\s+/).length,
      });
      if (history.length > 50) history.pop();
      context.globalState.update('vibeHistory', history);

      postToSidebar({ command: 'stageFinal', data: state, history });
    } else {
      currentAnalysis = state.tags; // Store tags for context
      postToSidebar({ command: 'stageResult', data: state });
    }
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Unknown error';
    postToSidebar({ command: 'stageError', message: msg });
    vscode.window.showErrorMessage(`Vibe: Stage failed — ${msg}`);
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
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Vibe Prompt Engine</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --red:#f06260;--red-h:#d95351;
  --z900:#18181b;--z800:#27272a;--z700:#3f3f46;--z600:#52525b;
  --z500:#71717a;--z400:#a1a1aa;--z300:#d4d4d8;--z200:#e4e4e7;
  --z100:#f4f4f5;--z50:#fafafa;
  --sh:0 4px 20px -2px rgba(0,0,0,.06);
  --sh2:0 10px 30px -4px rgba(0,0,0,.10);
  --r:10px;--tr:all .25s cubic-bezier(.4,0,.2,1)
}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif;
  background:#f4f4f5;color:#121212;min-height:100vh;
  -webkit-font-smoothing:antialiased;letter-spacing:-.01em;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;
  background-image:radial-gradient(#e4e4e7 .5px,transparent .5px);
  background-size:22px 22px;pointer-events:none;z-index:0}
#spot{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;
  background:radial-gradient(500px circle at var(--mx,50%) var(--my,50%),rgba(240,98,96,.04),transparent 80%);z-index:0}
.app{position:relative;z-index:1;max-width:660px;margin:0 auto;min-height:100vh;
  background:#fff;display:flex;flex-direction:column;box-shadow:var(--sh2)}
.accent{height:3px;background:linear-gradient(90deg,var(--red),var(--z900),var(--red));flex-shrink:0}
header{padding:13px 17px;border-bottom:1px solid var(--z100);display:flex;align-items:center;
  justify-content:space-between;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);
  position:sticky;top:0;z-index:10;flex-shrink:0}
.hl{display:flex;align-items:center;gap:10px}
.logo{width:33px;height:33px;background:var(--z900);border-radius:8px;display:flex;
  align-items:center;justify-content:center;box-shadow:var(--sh);transition:transform .2s;cursor:default}
.logo:hover{transform:scale(1.08) rotate(6deg)}
.h-t{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:var(--z900)}
.h-s{display:flex;align-items:center;gap:5px;margin-top:2px}
.pd{width:6px;height:6px;border-radius:50%;background:#22c55e;animation:pu 2s infinite}
@keyframes pu{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
.h-v{font-size:8px;font-family:monospace;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--z500)}
.hr{display:flex;align-items:center;gap:10px}
.lat{text-align:right}
.lat-l{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--z500)}
.lat-v{font-size:10px;font-family:monospace;color:var(--z900);font-weight:600}
.dv{width:1px;height:26px;background:var(--z100)}
.sds{display:flex;gap:4px}
.sd{width:7px;height:7px;border-radius:50%}
.sc{flex:1;overflow-y:auto;padding:19px 17px;display:flex;flex-direction:column;gap:22px;scroll-behavior:smooth}
.sc::-webkit-scrollbar{width:3px}
.sc::-webkit-scrollbar-track{background:transparent}
.sc::-webkit-scrollbar-thumb{background:var(--z200);border-radius:8px}
.sc::-webkit-scrollbar-thumb:hover{background:var(--red)}
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}
.sb{width:37px;height:37px;background:var(--z900);color:#fff;font-weight:900;font-size:13px;
  border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sl h3{font-size:17px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:var(--z900)}
.sl p{font-size:8px;font-family:monospace;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--z500);margin-top:1px}
.si{font-size:8px;font-family:monospace;font-weight:600;color:var(--z400)}
.rv{opacity:0;transform:translateY(13px);transition:opacity .55s cubic-bezier(.16,1,.3,1),transform .55s cubic-bezier(.16,1,.3,1)}
.rv.on{opacity:1;transform:none}
.iw{background:var(--z50);border:1px solid var(--z200);border-radius:var(--r);padding:13px;transition:var(--tr)}
.iw:focus-within{border-color:var(--red);background:#fff;box-shadow:0 0 0 3px rgba(240,98,96,.08)}
.it{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.il{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:var(--z400)}
.ity{display:flex;align-items:center;gap:4px;font-size:8px;font-family:monospace;font-weight:600;color:var(--z300);text-transform:uppercase}
textarea{width:100%;min-height:115px;background:transparent;border:none;outline:none;resize:none;
  font-family:'JetBrains Mono','Fira Code',monospace;font-size:12px;color:var(--z900);line-height:1.6}
textarea::placeholder{color:var(--z300)}
.if{display:flex;justify-content:flex-end;gap:5px;margin-top:4px}
.mb{font-size:8px;padding:2px 6px;border-radius:4px;background:var(--z100);color:var(--z500);font-family:monospace;font-weight:700;text-transform:uppercase}
.ms{display:flex;align-items:center;gap:8px;margin-top:10px;background:var(--z50);border:1px solid var(--z200);border-radius:8px;padding:8px 12px;transition:var(--tr);position:relative}
.ms:focus-within{border-color:var(--red);background:#fff;box-shadow:0 0 0 3px rgba(240,98,96,.07)}
.ms-ic{color:var(--z400);display:flex;align-items:center;flex-shrink:0}
.ms-lb{font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:var(--z400);flex-shrink:0;white-space:nowrap}
.ms select{flex:1;border:none;background:transparent;outline:none;font-size:10px;font-family:monospace;font-weight:700;color:var(--z900);appearance:none;cursor:pointer;min-width:0}
.ms-arrow{color:var(--z400);pointer-events:none;display:flex;position:absolute;right:10px}
.bp{width:100%;margin-top:11px;background:var(--red);color:#fff;border:none;padding:12px 17px;
  border-radius:8px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;
  transition:var(--tr);box-shadow:0 4px 14px rgba(240,98,96,.22)}
.bp:hover{background:var(--red-h);transform:translateY(-1px);box-shadow:0 6px 20px rgba(240,98,96,.28)}
.bp:active{transform:scale(.98)} .bp:disabled{opacity:.5;cursor:not-allowed;transform:none}
.bp:hover svg{transform:translateX(3px)} .bp svg{transition:transform .2s}
.bd{width:100%;margin-top:11px;background:var(--z900);color:#fff;border:none;padding:12px 17px;
  border-radius:8px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.2em;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;
  transition:var(--tr);box-shadow:0 4px 14px rgba(0,0,0,.10)}
.bd:hover{background:var(--red);box-shadow:0 0 20px rgba(240,98,96,.2);transform:translateY(-1px)}
.bd:active{transform:scale(.98)} .bd:disabled{opacity:.5;cursor:not-allowed;transform:none}
.kc{background:#fff;border:1px solid var(--z200);border-top:3px solid var(--red);border-radius:var(--r);
  padding:17px;box-shadow:var(--sh);position:relative;overflow:hidden;transition:box-shadow .25s}
.kc:hover{box-shadow:var(--sh2)}
.ch{display:flex;align-items:center;justify-content:space-between;padding-bottom:11px;
  border-bottom:1px solid var(--z50);margin-bottom:13px}
.ct{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:var(--red)}
.ci{font-size:8px;font-family:monospace;font-weight:700;color:var(--z300);margin-left:5px}
.cp{display:flex;align-items:center;gap:4px;background:var(--z50);border:1px solid var(--z100);padding:3px 8px;border-radius:100px}
.cp span{font-size:8px;font-family:monospace;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:var(--z500)}
.tgs{display:flex;flex-wrap:wrap;gap:5px;margin:5px 0 13px}
.tg{font-size:8px;font-family:monospace;font-weight:700;padding:2px 7px;border-radius:4px;
  background:var(--z100);color:var(--z600);text-transform:uppercase;letter-spacing:.05em}
.tg.r{background:rgba(240,98,96,.09);color:var(--red)}
.tg.dk{background:var(--z900);color:#fff}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.ff{grid-column:1/-1}
.fi{display:flex;flex-direction:column;gap:5px}
.lb{display:flex;align-items:center;gap:5px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:var(--z400)}
.ld{width:4px;height:4px;border-radius:50%;background:var(--z300)}
.sw{position:relative;border:1px solid var(--z200);border-radius:8px;background:var(--z50);
  display:flex;align-items:center;transition:var(--tr);overflow:hidden}
.sw:focus-within{border-color:var(--red);background:#fff;box-shadow:0 0 0 3px rgba(240,98,96,.06)}
.sw:focus-within .fi-i{color:var(--red)} .sw:focus-within .chv{transform:rotate(180deg);color:var(--red)}
.fi-i{padding:0 9px;color:var(--z400);transition:color .2s;display:flex;align-items:center;flex-shrink:0}
.sw select{flex:1;border:none;background:transparent;outline:none;padding:9px 22px 9px 0;
  font-size:10px;font-family:monospace;font-weight:700;color:var(--z900);appearance:none;cursor:pointer}
.chv{position:absolute;right:8px;pointer-events:none;color:var(--z400);display:flex;transition:transform .25s}
.er{display:none;background:rgba(240,98,96,.08);border:1px solid rgba(240,98,96,.2);border-radius:8px;
  padding:8px 12px;font-size:10px;font-family:monospace;color:var(--red);margin-top:8px}
.tm{border-radius:var(--r);overflow:hidden;background:var(--z900);border:1px solid var(--z800);transition:border-color .25s}
.tm:hover{border-color:rgba(240,98,96,.3)}
.tb{height:27px;background:var(--z800);display:flex;align-items:center;padding:0 10px;gap:5px}
.td{width:8px;height:8px;border-radius:50%}
.tt{flex:1;text-align:center;font-size:8px;font-family:monospace;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:var(--z500)}
.tbd{padding:17px;min-height:155px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden}
.sc-line{position:absolute;inset:0;background:linear-gradient(to bottom,transparent,rgba(240,98,96,.04),transparent);
  animation:sc 3s linear infinite;pointer-events:none;opacity:.3}
@keyframes sc{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
.i-txt{font-size:11px;font-family:monospace;color:var(--z500);font-style:italic;text-align:center}
.i-txt .cr{color:var(--red);opacity:.6}
.rb{display:flex;align-items:center;gap:7px;margin-top:8px}
.rdot{width:6px;height:6px;border-radius:50%;background:var(--red);animation:pu 2s infinite}
.rb span{font-size:9px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:.18em}
.sk-r{display:flex;align-items:center;gap:6px;margin-bottom:3px}
.sk-d{width:5px;height:5px;border-radius:50%;background:var(--red);animation:pu 1.2s infinite;flex-shrink:0}
.sk-l{font-size:8px;font-family:monospace;color:var(--z400);text-transform:uppercase}
.sk{height:9px;border-radius:4px;background:linear-gradient(90deg,#27272a 25%,#3f3f46 50%,#27272a 75%);
  background-size:200% 100%;animation:sh 1.8s infinite linear}
@keyframes sh{0%{background-position:-200% 0}100%{background-position:200% 0}}
.r-ok{font-size:9px;font-family:monospace;font-weight:700;color:var(--red);margin-bottom:6px}
#rTxt{font-size:11px;font-family:monospace;color:#d4d4d8;line-height:1.65;white-space:pre-wrap;word-break:break-word;width:100%}
.ra{display:flex;gap:6px;margin-top:9px;justify-content:center}
.ab{display:flex;align-items:center;gap:5px;padding:7px 13px;border-radius:100px;
  border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);
  color:var(--z400);font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:var(--tr)}
.ab:hover{background:var(--red);color:#fff;border-color:var(--red);transform:translateY(-1px)}
.tf{height:20px;background:var(--z900);border-top:1px solid rgba(255,255,255,.04);
  display:flex;align-items:center;justify-content:space-between;padding:0 10px}
.tf span{font-size:8px;font-family:monospace;font-weight:600;color:var(--z600);text-transform:uppercase;letter-spacing:.06em}
footer{background:var(--z50);border-top:1px solid var(--z100);padding:8px 17px;
  display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.fl{display:flex;align-items:center;gap:11px}
.fli{display:flex;align-items:center;gap:4px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--z400)}
.fdo{width:4px;height:4px;border-radius:50%;background:var(--z300)}
.fr2{display:flex;align-items:center;gap:5px;font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.ok{color:#22c55e}
</style>
</head>
<body>
<div id="spot"></div>
<div class="app">
<div class="accent"></div>

<!-- HEADER -->
<header>
  <div class="hl">
    <div class="logo">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f06260" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    </div>
    <div>
      <div class="h-t">Vibe Prompt Engine</div>
      <div class="h-s"><div class="pd"></div><span class="h-v">PRECISION_CORE: V2.4.0</span></div>
    </div>
  </div>
  <div class="hr">
    <div class="lat"><div class="lat-l">Latency</div><div class="lat-v" id="latV">--ms</div></div>
    <div class="dv"></div>
    <div class="sds">
      <div class="sd" id="d0" style="background:#f06260"></div>
      <div class="sd" id="d1" style="background:#e4e4e7"></div>
      <div class="sd" id="d2" style="background:#e4e4e7"></div>
    </div>
  </div>
</header>

<!-- SCROLL -->
<div class="sc" id="scr">

  <!-- STEP 01 -->
  <section class="rv" data-step="1" id="s1">
    <div class="sh">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="sb">01</div>
        <div class="sl"><h3>Raw Prompt</h3><p>INITIATING_SEQUENCE_INPUT</p></div>
      </div>
      <span class="si">UTF-8 // STREAM</span>
    </div>
    <div class="iw">
      <div class="it">
        <span class="il">INPUT STREAM</span>
        <div class="ity">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          TTY_READY
        </div>
      </div>
      <textarea id="promptInput" placeholder="e.g. build a high-performance dashboard with real-time charts..."></textarea>
      <div class="if">
        <span class="mb" id="lnC">ln 1</span>
        <span class="mb" id="chC">ch 0</span>
      </div>
    </div>
    <!-- MODEL SELECTOR -->
    <div class="ms">
      <div class="ms-ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
      <span class="ms-lb">Model</span>
      <select id="selModel">
        <option value="qwen2.5:7b" selected>🧠 Qwen 2.5 7B (Ollama)</option>
        <option value="qwen2.5:14b">🧠 Qwen 2.5 14B (Ollama)</option>
      </select>
      <div class="ms-arrow"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
    </div>
    <div class="er" id="aErr"></div>
    <button class="bp" id="aBtn">
      <span id="aTxt">Analyze Intent</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </button>
  </section>

  <!-- STEP 02 -->
  <section class="rv" data-step="2" id="s2" style="display:none">
    <div class="sh">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="sb">02</div>
        <div class="sl"><h3>User Selection</h3><p>PARAM_DETERMINATION</p></div>
      </div>
    </div>
    <div class="kc">
      <div style="position:absolute;top:7px;right:7px;display:flex;gap:2px;pointer-events:none">
        <div style="width:4px;height:4px;background:#f4f4f5"></div>
        <div style="width:4px;height:4px;background:#e4e4e7"></div>
        <div style="width:4px;height:4px;background:#f4f4f5"></div>
      </div>
      <div class="ch">
        <div><span class="ct" id="cTi">CONFIGURING: PROMPT</span><span class="ci">#4412</span></div>
        <div class="cp"><div class="pd" style="width:5px;height:5px"></div><span>Context-Aware</span></div>
      </div>
      <div class="lb" style="margin-bottom:5px"><div class="ld"></div> Detected Intent</div>
      <div class="tgs" id="iTgs"><span class="tg">Awaiting analysis...</span></div>
      <div class="fg" id="dynamicQuestions">
        <!-- Questions injected here by JS -->
      </div>
      <div class="er" id="bErr"></div>
      <div style="display:flex;gap:10px;margin-top:11px">
        <button class="bd" id="bBtnBack" style="background:var(--z800);flex:1;width:auto;padding:12px 10px;margin-top:0" title="Back to Step 1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span>Back</span>
        </button>
        <button class="bd" id="bBtn" style="flex:1;width:auto;padding:12px 10px;margin-top:0">
          <span id="bTxt">Next</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
        </button>
      </div>
    </div>
  </section>

  <!-- STEP 03 -->
  <section class="rv" data-step="3" id="s3" style="display:none">
    <div class="sh">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="sb">03</div>
        <div class="sl"><h3>Final Prompt</h3><p>TERMINAL_OUTPUT_READY</p></div>
      </div>
    </div>
    <div class="tm">
      <div class="tb">
        <div class="td" style="background:rgba(239,68,68,.3)"></div>
        <div class="td" style="background:rgba(234,179,8,.3)"></div>
        <div class="td" style="background:rgba(34,197,94,.3)"></div>
        <div class="tt">Compiler_Ready</div>
      </div>
      <div class="tbd">
        <div class="sc-line"></div>
        <div id="stIdle" style="display:flex;flex-direction:column;align-items:center;gap:10px">
          <p class="i-txt"><span class="cr">&gt;</span> Awaiting build completion...</p>
          <div class="rb"><div class="rdot"></div><span>Ready to Transmit</span></div>
        </div>
        <div id="stLoad" style="display:none;width:100%;max-width:290px;flex-direction:column;gap:8px;font-family:monospace;font-size:11px;color:var(--z400)">
          <!-- Dynamic terminal output -->
        </div>
        <div id="stRes" style="display:none;width:100%;flex-direction:column;gap:9px">
          <div class="r-ok" id="rOk" style="font-size:11px; margin-bottom:10px;"></div>
          <div id="rTxt"></div>
          <div class="ra">
            <button class="ab" id="copyBtn">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
            <button class="ab" id="sendBtn">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Send to Editor
            </button>
          </div>
        </div>
      </div>
      <div class="tf">
        <span id="tSt">STDOUT: IDLE</span>
        <span>v2.4.0-stable</span>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:10px">
      <button class="bp" id="cBtnBack" style="background:var(--z800);box-shadow:none;flex:1;width:auto;padding:12px 10px;margin-top:0" title="Back to Step 2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        <span>Back</span>
      </button>
      <button class="bp" id="rstBtn" style="background:var(--z900);box-shadow:none;flex:1;width:auto;padding:12px 10px;margin-top:0">
        <span>New Prompt</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.31"/></svg>
      </button>
    </div>
  </section>

</div><!-- /sc -->

<footer>
  <div class="fl">
    <div class="fli"><div class="fdo"></div>Kinetic System</div>
    <div class="fli"><div class="fdo"></div>Precision 1.0</div>
  </div>
  <div class="fr2"><span style="color:var(--z400)">Status</span><span class="ok" id="fSt">Nominal</span></div>
</footer>
</div>

<script>
  const vscode = acquireVsCodeApi();
  const g = id => document.getElementById(id);
  const pi=g('promptInput'),chC=g('chC'),lnC=g('lnC');
  const aBtn=g('aBtn'),aTxt=g('aTxt'),aErr=g('aErr');
  const s1=g('s1'),s2=g('s2'),s3=g('s3'),cTi=g('cTi'),iTgs=g('iTgs');
  const bBtn=g('bBtn'),bTxt=g('bTxt'),bErr=g('bErr');
  const stIdle=g('stIdle'),stLoad=g('stLoad'),stRes=g('stRes');
  const rTxt=g('rTxt'),tSt=g('tSt');
  const copyBtn=g('copyBtn'),sendBtn=g('sendBtn'),rstBtn=g('rstBtn');
  const latV=g('latV'),fSt=g('fSt'),scr=g('scr'),spot=g('spot');
  let t0=0;
  let currentSelections = {};
  let typingInterval = null;

  window.addEventListener('mousemove',e=>{
    spot.style.setProperty('--mx',e.clientX+'px');
    spot.style.setProperty('--my',e.clientY+'px');
  });

  setTimeout(()=>{
    document.querySelectorAll('.rv').forEach((el,i)=>{
      if(el.style.display!=='none') setTimeout(()=>el.classList.add('on'),i*110);
    });
  },50);

  function show(el){
    el.style.display='';
    setTimeout(()=>el.classList.add('on'),30);
    setTimeout(()=>scr.scrollTo({top:0,behavior:'smooth'}),90);
  }
  function hide(el){
    el.classList.remove('on');
    setTimeout(()=>el.style.display='none', 400);
  }

  pi.addEventListener('input',()=>{
    chC.textContent='ch '+pi.value.length;
    lnC.textContent='ln '+pi.value.split('\\n').length;
  });

  function dots(n){
    [g('d0'),g('d1'),g('d2')].forEach((d,i)=>d.style.background=i<n?'#f06260':'#e4e4e7');
  }
  function status(txt,ok){fSt.textContent=txt;fSt.style.color=ok?'#22c55e':'#f06260';}
  function term(s){
    stIdle.style.display=s==='idle'?'flex':'none';
    stLoad.style.display=s==='load'?'flex':'none';
    stRes.style.display =s==='res' ?'flex':'none';
  }
  function type(el,txt,spd=11,cb=null){
    el.textContent='';let i=0;
    const t=setInterval(()=>{
      if(i<txt.length){el.textContent+=txt[i];i++;}
      else { clearInterval(t); if(cb) cb(); }
    },spd);
  }
  
  function startTypingAnim(el, baseTxt) {
    if(typingInterval) clearInterval(typingInterval);
    let dots = 0;
    el.textContent = baseTxt;
    typingInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      el.textContent = baseTxt + '.'.repeat(dots);
    }, 400);
  }
  function stopTypingAnim() {
    if(typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  }
  
  const termLines = [
    "[BOOTING AI ENGINE...]",
    "[ANALYZING USER INTENT...]",
    "[PARAMETER DETECTION ACTIVE]",
    "[REFINING PROMPT...]",
    "[GENERATING FINAL OUTPUT...]"
  ];

  function runTerminalLoad() {
    stLoad.innerHTML = '';
    let tOffset = 0;
    termLines.forEach((line, i) => {
      setTimeout(() => {
        if (stLoad.style.display === 'none') return;
        const div = document.createElement('div');
        div.style.color = 'var(--z400)';
        stLoad.appendChild(div);
        type(div, line, 15);
      }, tOffset);
      tOffset += 500 + Math.random() * 300;
    });
  }

  aBtn.addEventListener('click',()=>{
    const p=pi.value.trim();
    if(!p){aErr.textContent='Please enter a prompt first.';aErr.style.display='block';return;}
    aErr.style.display='none';
    aBtn.disabled=true;
    startTypingAnim(aTxt, 'AI is typing');
    t0=Date.now();status('Analyzing...',true);
    currentSelections = {};
    const selectedModel = document.getElementById('selModel').value;
    vscode.postMessage({command:'nextStage',prompt:p,model:selectedModel, selections:{}});
  });

  bBtn.addEventListener('click',()=>{
    bErr.style.display='none';
    bBtn.disabled=true;
    startTypingAnim(bTxt, 'AI is typing');
    t0=Date.now();status('Processing...',true);
    
    const dynSels = document.querySelectorAll('#dynamicQuestions select');
    dynSels.forEach(s => {
      currentSelections[s.dataset.q] = s.value;
    });

    const selectedModel = document.getElementById('selModel').value;
    vscode.postMessage({command:'nextStage',prompt:pi.value.trim(),
      model:selectedModel,
      selections: currentSelections});
  });

  const bBtnBack = g('bBtnBack'), cBtnBack = g('cBtnBack');
  if(bBtnBack) {
    bBtnBack.addEventListener('click', () => {
      hide(s2);
      setTimeout(() => show(s1), 400);
    });
  }
  if(cBtnBack) {
    cBtnBack.addEventListener('click', () => {
      hide(s3);
      setTimeout(() => show(s2), 400);
    });
  }

  copyBtn.addEventListener('click',()=>{
    vscode.postMessage({command:'copyPrompt'});
    copyBtn.textContent='Copied!';
    setTimeout(()=>{copyBtn.innerHTML='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';},2000);
  });

  sendBtn.addEventListener('click',()=>{
    vscode.postMessage({command:'sendToAI'});status('Sent to editor',true);
  });

  rstBtn.addEventListener('click',()=>{
    pi.value='';chC.textContent='ch 0';lnC.textContent='ln 1';
    aBtn.disabled=false;aTxt.textContent='Analyze Intent';
    aErr.style.display='none';bErr.style.display='none';
    currentSelections = {};
    s2.style.display='none';s2.classList.remove('on');
    s3.style.display='none';s3.classList.remove('on');
    show(s1);
    term('idle');tSt.textContent='STDOUT: IDLE';
    dots(1);status('Nominal',true);
    scr.scrollTo({top:0,behavior:'smooth'});
  });

  window.addEventListener('message',e=>{
    const m=e.data;
    switch(m.command){
      case 'stageStart': break;
      case 'stageResult':{
        stopTypingAnim();
        latV.textContent=(Date.now()-t0)+'ms';
        aBtn.disabled=false;aTxt.textContent='Analyze Intent';
        bBtn.disabled=false;bTxt.textContent='Next';
        
        const state=m.data;
        const tagsObj=state.tags || {};
        const intentObj = tagsObj.intent || {};
        const intentStr = intentObj.primary_intent || 'General';
        const complexityStr = state.estimated_complexity || 'Medium';
        const conf = state.confidence || 0.5;
        
        const tags = [];
        tags.push({l:intentStr,c:'r'});
        tags.push({l:complexityStr,c:'dk'});
        tags.push({l:Math.round(conf * 100) + '% Conf',c:'ok'});
        
        const questions = state.questions || [];
        questions.slice(0,2).forEach(q=>tags.push({l:q.title.substring(0,28),c:''}));

        iTgs.innerHTML=tags.map(t=>'<span class="tg '+(t.c||'')+'">'+t.l+'</span>').join('')
          ||'<span class="tg">General prompt</span>';
        
        cTi.textContent='CONFIGURING: ' + intentStr.toUpperCase().substring(0,22);
        
        
        
        // Render dynamic questions
        const dynQ = g('dynamicQuestions');
        dynQ.innerHTML = '';
        if (questions.length > 0) {
          questions.forEach((q, i) => {
            const fi = document.createElement('div');
            fi.className = 'fi';
            
            const label = document.createElement('label');
            label.className = 'lb';
            label.innerHTML = '<div class="ld"></div> ' + q.title;
            fi.appendChild(label);
            
            if (q.why_it_matters) {
              const why = document.createElement('div');
              why.style = 'font-size:7px; color:var(--z400); margin-bottom:4px; margin-top:-2px; padding-left:14px;';
              why.textContent = q.why_it_matters;
              fi.appendChild(why);
            }
            
            const sw = document.createElement('div');
            sw.className = 'sw';
            sw.innerHTML = '<div class="fi-i"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg></div>';
            
            const sel = document.createElement('select');
            sel.id = 'selDyn_' + i;
            sel.dataset.q = q.title;
            (q.options || []).forEach(opt => {
              const o = document.createElement('option');
              o.value = opt;
              o.textContent = opt;
              sel.appendChild(o);
            });
            sw.appendChild(sel);
            
            const chv = document.createElement('div');
            chv.className = 'chv';
            chv.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
            sw.appendChild(chv);
            
            fi.appendChild(sw);
            dynQ.appendChild(fi);
          });
        }

        dots(2);status('Questions Generated',true);
        if(s1.style.display !== 'none') {
            hide(s1);
            setTimeout(()=>{show(s2);}, 400);
        }
        break;
      }
      case 'stageError':
        stopTypingAnim();
        latV.textContent=(Date.now()-t0)+'ms';
        aBtn.disabled=false;aTxt.textContent='Analyze Intent';
        bBtn.disabled=false;bTxt.textContent='Next';
        aErr.textContent='Error: '+m.message;aErr.style.display='block';
        bErr.textContent='Error: '+m.message;bErr.style.display='block';
        status('Error',false);break;
      case 'stageFinal':{
        stopTypingAnim();
        latV.textContent=(Date.now()-t0)+'ms';
        aBtn.disabled=false;aTxt.textContent='Analyze Intent';
        bBtn.disabled=false;bTxt.textContent='Next';
        term('res');tSt.textContent='STDOUT: READY';
        dots(3);status('Build complete',true);
        
        hide(s1); hide(s2);
        setTimeout(()=>{
          if(s3.style.display==='none') show(s3);
          const rOk = g('rOk');
          type(rOk, '[SUCCESS] COMPILATION COMPLETE', 10, () => {
            type(rTxt, m.data.final_prompt || '', 5);
          });
        }, 400);
        
        break;
      }
      case 'setPrompt':
        pi.value=m.prompt||'';
        chC.textContent='ch '+(m.prompt||'').length;
        lnC.textContent='ln '+(m.prompt||'').split('\\n').length;break;
      case 'reset': stopTypingAnim(); rstBtn.click();break;
    }
  });

  dots(1);
</script>
</body>
</html>`;}

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
