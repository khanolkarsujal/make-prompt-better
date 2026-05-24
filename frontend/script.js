/* =====================================================
   Vibe Prompt Engine – Frontend State Machine
   ===================================================== */

// ---- Config ----
let API_URL = localStorage.getItem('vpe_backend_url') || 'http://localhost:8000/api';
let AI_PROVIDER = localStorage.getItem('vpe_ai_provider') || 'xai';

// ---- Global State ----
let currentStep = 1;
let currentPrompt = '';
let currentAnalysis = null;
let selections = {};
let totalQuestions = 0;
let currentEnhancedPrompt = '';
let projectContext = JSON.parse(localStorage.getItem('vpe_context') || '{}');

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadContextForm();
  checkBackendStatus();
  loadTemplates();
  renderHistory();
  renderFavorites();
  activatePipelineStep(1);

  // Show context chip if context is saved
  if (projectContext.projectName || projectContext.techStack) {
    document.getElementById('contextChipRow').style.display = 'block';
    document.getElementById('contextChip').textContent =
      `🔍 ${projectContext.projectName || 'Project'} · ${projectContext.techStack || ''}`;
  }
});

// =====================================================
//  BACKEND STATUS CHECK
// =====================================================
async function checkBackendStatus() {
  const badge = document.getElementById('backendStatus');
  try {
    const resp = await fetch(API_URL.replace('/api', '/'), { signal: AbortSignal.timeout(4000) });
    if (resp.ok) {
      badge.textContent = '● Backend Online';
      badge.className = 'badge badge-green';
    } else {
      throw new Error();
    }
  } catch {
    badge.textContent = '● Backend Offline';
    badge.className = 'badge badge-red';
    showToast('Backend not reachable. Make sure FastAPI is running on port 8000.', 'error');
  }
}

// =====================================================
//  PIPELINE STEP MANAGEMENT
// =====================================================
function activatePipelineStep(step) {
  currentStep = step;
  // Pipeline bar
  document.querySelectorAll('.pipe-step').forEach(el => {
    const n = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (n < step) el.classList.add('done');
    else if (n === step) el.classList.add('active');
  });

  // Panels
  const panels = {
    1: 'panelInput',
    2: 'panelInput',
    3: 'panelIntent',
    4: 'panelSuggestions',
    5: 'panelSuggestions',
    6: 'panelBuilding',
    7: 'panelResult',
  };
  document.querySelectorAll('.panel-section').forEach(p => p.classList.remove('active-panel'));
  const panelId = panels[step];
  if (panelId) document.getElementById(panelId).classList.add('active-panel');

  // Scroll to top of main
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =====================================================
//  STEP 1: USER INPUT
// =====================================================
function handleInputKeydown(e) {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    startAnalysis();
  }
}

async function startAnalysis() {
  const input = document.getElementById('promptInput');
  const prompt = input.value.trim();
  if (!prompt) {
    showToast('Please enter a prompt first.', 'error');
    return;
  }

  currentPrompt = prompt;
  selections = {};
  currentEnhancedPrompt = '';

  // Update sidebar
  updateSidebarState();

  // Disable button
  document.getElementById('analyzeBtn').disabled = true;

  // Step 2: Capture → Step 3: Intent
  activatePipelineStep(2);
  await sleep(300);
  activatePipelineStep(3);

  // Show loading
  document.getElementById('analysisLoading').style.display = 'flex';
  document.getElementById('analysisGrid').style.display = 'none';

  try {
    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    currentAnalysis = await response.json();

    // Show analysis results
    displayAnalysis(currentAnalysis);

    // Move to Step 4 after brief pause
    await sleep(1200);
    activatePipelineStep(4);
    displayQuestions(currentAnalysis.suggestions.questions);

  } catch (err) {
    activatePipelineStep(1);
    document.getElementById('analyzeBtn').disabled = false;
    showToast(`Error: ${err.message}`, 'error');
  }
}

// =====================================================
//  STEP 3: DISPLAY ANALYSIS
// =====================================================
function displayAnalysis(analysis) {
  document.getElementById('analysisLoading').style.display = 'none';
  document.getElementById('analysisGrid').style.display = 'grid';

  const intent = analysis.intent || {};
  const ctx = analysis.context || {};
  const amb = analysis.ambiguity || {};

  // Intent card
  document.getElementById('intentResult').innerHTML = `
    <span class="analysis-tag">${intent.primary_intent || 'create'}</span>
    <span class="analysis-tag ${intent.complexity === 'high' ? 'yellow' : 'green'}">${intent.complexity || 'medium'}</span>
    <span class="analysis-tag">${intent.domain || 'web'}</span>
    <div style="margin-top:8px;font-size:12px;color:var(--text-secondary)">
      Confidence: ${Math.round((intent.confidence || 0.7) * 100)}%
    </div>
  `;

  // Context card
  const techStack = (ctx.tech_stack || []).slice(0, 4);
  document.getElementById('contextResult').innerHTML = `
    <span class="analysis-tag green">${ctx.project_type || 'app'}</span>
    ${techStack.map(t => `<span class="analysis-tag">${t}</span>`).join('')}
    ${ctx.missing_context?.length ? `<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">Missing: ${ctx.missing_context.slice(0,2).join(', ')}</div>` : ''}
  `;

  // Ambiguity card
  const ambScore = Math.round((amb.ambiguity_score || 0.6) * 100);
  const ambColor = ambScore > 70 ? 'yellow' : ambScore > 40 ? '' : 'green';
  document.getElementById('ambiguityResult').innerHTML = `
    <span class="analysis-tag ${ambColor}">Score: ${ambScore}%</span>
    <span class="analysis-tag ${amb.clarification_needed ? 'yellow' : 'green'}">${amb.clarification_needed ? 'Clarification needed' : 'Clear enough'}</span>
    ${(amb.ambiguous_terms || []).slice(0,3).map(t => `<span class="analysis-tag" style="font-size:10px">${t}</span>`).join('')}
  `;
}

// =====================================================
//  STEP 4-5: QUESTIONS & SELECTIONS
// =====================================================
function displayQuestions(questions) {
  totalQuestions = questions.length;
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';
  document.getElementById('questionsFooter').style.display = 'flex';
  updateProgress();

  questions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
      <div class="question-header">
        <div class="question-num">${idx + 1}</div>
        <div class="question-text">${q.question}</div>
        <div class="question-category">${q.category || ''}</div>
      </div>
      <div class="options-grid">
        ${q.options.map((opt, oi) => `
          <button
            class="option-btn"
            id="opt-${idx}-${oi}"
            onclick="selectOption(${idx}, ${oi}, '${opt.replace(/'/g, "\\'")}')"
            data-q="${idx}"
            data-o="${oi}"
          >${opt}</button>
        `).join('')}
      </div>
    `;
    container.appendChild(card);
  });

  // Update sidebar
  document.getElementById('sidebarSuggestionsBadge').textContent = `${questions.length} questions`;
}

function selectOption(qIdx, oIdx, value) {
  // Clear others in row
  document.querySelectorAll(`[data-q="${qIdx}"]`).forEach(b => b.classList.remove('selected'));
  document.getElementById(`opt-${qIdx}-${oIdx}`).classList.add('selected');

  const q = currentAnalysis.suggestions.questions[qIdx];
  selections[q.question] = value;

  updateProgress();
  activatePipelineStep(5);
}

function updateProgress() {
  const answered = Object.keys(selections).length;
  document.getElementById('selectionProgress').textContent = `${answered} / ${totalQuestions} answered`;
  document.getElementById('continueBtn').disabled = answered < totalQuestions;
}

// =====================================================
//  STEP 6: BUILD ENHANCED PROMPT
// =====================================================
async function buildEnhancedPrompt() {
  activatePipelineStep(6);

  try {
    // Animate build steps
    await sleep(500);
    document.getElementById('bstep1').className = 'build-step done';
    document.getElementById('bstep2').className = 'build-step active';

    const response = await fetch(`${API_URL}/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: currentPrompt,
        selections,
        intent: currentAnalysis.intent,
        context: currentAnalysis.context
      })
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const result = await response.json();
    currentEnhancedPrompt = result.enhanced_prompt;

    await sleep(400);
    document.getElementById('bstep2').className = 'build-step done';
    document.getElementById('bstep3').className = 'build-step active';
    await sleep(600);
    document.getElementById('bstep3').className = 'build-step done';
    await sleep(300);

    // Save to history
    await saveToHistory(result);

    activatePipelineStep(7);
    displayResult(result);

  } catch (err) {
    activatePipelineStep(5);
    showToast(`Build failed: ${err.message}`, 'error');
  }
}

// =====================================================
//  STEP 7: DISPLAY RESULT
// =====================================================
function displayResult(result) {
  const enhanced = result.enhanced_prompt || '';
  const meta = result.metadata || {};
  const wordCount = meta.word_count || enhanced.split(/\s+/).length;

  // Meta badges
  document.getElementById('resultMeta').innerHTML = `
    <div class="meta-tag">📝 <strong>${wordCount}</strong> words</div>
    <div class="meta-tag">🎯 <strong>${Object.keys(selections).length}</strong> selections made</div>
    <div class="meta-tag">🧠 <strong>${currentAnalysis?.intent?.primary_intent || 'create'}</strong> intent</div>
    <div class="meta-tag">⚡ <strong>${currentAnalysis?.intent?.domain || 'web'}</strong> domain</div>
  `;

  // Content
  document.getElementById('resultBox').textContent = enhanced;

  // Sidebar
  updateSidebarState(true);
}

// =====================================================
//  ACTIONS: Copy, Send, Favorites, Reset
// =====================================================
async function copyResult() {
  if (!currentEnhancedPrompt) return;
  try {
    await navigator.clipboard.writeText(currentEnhancedPrompt);
    showToast('✅ Copied to clipboard!', 'success');
    document.getElementById('copyBtn').textContent = '✅ Copied!';
    setTimeout(() => { document.getElementById('copyBtn').textContent = '📋 Copy to Clipboard'; }, 2000);
  } catch {
    showToast('Failed to copy. Please select and copy manually.', 'error');
  }
}

function sendToAI() {
  if (!currentEnhancedPrompt) return;
  // Copy to clipboard as the "send" action in the browser
  navigator.clipboard.writeText(currentEnhancedPrompt).then(() => {
    showToast('🚀 Prompt copied! Paste it into Cursor, Copilot, or Claude.', 'success');
  });
}

function saveToFavorites() {
  if (!currentEnhancedPrompt) return;
  const history = getHistoryFromStorage();
  const latest = history[0];
  if (latest) {
    latest.is_favorite = true;
    localStorage.setItem('vpe_history', JSON.stringify(history));
    renderHistory();
    renderFavorites();
    showToast('⭐ Saved to favorites!', 'success');
  }
}

function resetPipeline() {
  currentPrompt = '';
  currentAnalysis = null;
  selections = {};
  currentEnhancedPrompt = '';
  totalQuestions = 0;

  document.getElementById('promptInput').value = '';
  document.getElementById('analyzeBtn').disabled = false;
  document.getElementById('questionsContainer').innerHTML = '';
  document.getElementById('questionsFooter').style.display = 'none';
  document.getElementById('analysisGrid').style.display = 'none';
  document.getElementById('analysisLoading').style.display = 'flex';
  document.getElementById('bstep1').className = 'build-step';
  document.getElementById('bstep2').className = 'build-step active';
  document.getElementById('bstep3').className = 'build-step';

  activatePipelineStep(1);
  updateSidebarState(false);
}

// =====================================================
//  HISTORY
// =====================================================
function getHistoryFromStorage() {
  return JSON.parse(localStorage.getItem('vpe_history') || '[]');
}

async function saveToHistory(result) {
  const history = getHistoryFromStorage();
  const entry = {
    id: Date.now().toString(),
    prompt: currentPrompt,
    enhanced_prompt: result.enhanced_prompt,
    selections,
    created_at: new Date().toISOString(),
    is_favorite: false,
    word_count: (result.metadata?.word_count) || result.enhanced_prompt.split(/\s+/).length
  };
  history.unshift(entry);
  if (history.length > 50) history.pop();
  localStorage.setItem('vpe_history', JSON.stringify(history));

  // Also save to backend
  try {
    await fetch(`${API_URL}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: currentPrompt,
        enhanced_prompt: result.enhanced_prompt,
        selections
      })
    });
  } catch { /* backend history save is optional */ }

  renderHistory();
  renderFavorites();
}

function renderHistory() {
  const history = getHistoryFromStorage();
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');

  if (history.length === 0) {
    empty.style.display = 'flex';
    list.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = history.map(item => `
    <div class="history-item" title="${item.prompt}">
      <div class="history-item-prompt">${item.prompt}</div>
      <div class="history-item-meta">
        <span>${timeAgo(item.created_at)}</span>
        <span>·</span>
        <span>${item.word_count || '?'} words</span>
        ${item.is_favorite ? '<span>⭐</span>' : ''}
      </div>
      <div class="history-item-actions">
        <button class="history-action-btn" onclick="loadFromHistory('${item.id}')">↩ Load</button>
        <button class="history-action-btn ${item.is_favorite ? 'starred' : ''}" onclick="toggleHistoryFavorite('${item.id}')">
          ${item.is_favorite ? '⭐' : '☆'} Favorite
        </button>
        <button class="history-action-btn" onclick="deleteHistoryItem('${item.id}')">🗑</button>
      </div>
    </div>
  `).join('');
}

function renderFavorites() {
  const history = getHistoryFromStorage();
  const favorites = history.filter(h => h.is_favorite);
  const list = document.getElementById('favoritesList');
  const empty = document.getElementById('favoritesEmpty');

  if (favorites.length === 0) {
    empty.style.display = 'flex';
    list.innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = favorites.map(item => `
    <div class="history-item">
      <div class="history-item-prompt">${item.prompt}</div>
      <div class="history-item-meta">
        <span>⭐ Favorite</span>
        <span>·</span>
        <span>${item.word_count || '?'} words</span>
      </div>
      <div class="history-item-actions">
        <button class="history-action-btn" onclick="loadFromHistory('${item.id}')">↩ Load</button>
        <button class="history-action-btn starred" onclick="toggleHistoryFavorite('${item.id}')">⭐ Remove</button>
      </div>
    </div>
  `).join('');
}

function loadFromHistory(id) {
  const history = getHistoryFromStorage();
  const item = history.find(h => h.id === id);
  if (!item) return;

  currentEnhancedPrompt = item.enhanced_prompt;
  document.getElementById('promptInput').value = item.prompt;
  document.getElementById('resultBox').textContent = item.enhanced_prompt;
  document.getElementById('resultMeta').innerHTML = `
    <div class="meta-tag">📝 <strong>${item.word_count || '?'}</strong> words</div>
    <div class="meta-tag">⏱ Loaded from history</div>
  `;
  activatePipelineStep(7);
  updateSidebarState(true);
  showToast('✅ Loaded from history', 'success');
  closeSidebar();
}

function toggleHistoryFavorite(id) {
  const history = getHistoryFromStorage();
  const item = history.find(h => h.id === id);
  if (item) {
    item.is_favorite = !item.is_favorite;
    localStorage.setItem('vpe_history', JSON.stringify(history));
    renderHistory();
    renderFavorites();
  }
}

function deleteHistoryItem(id) {
  let history = getHistoryFromStorage();
  history = history.filter(h => h.id !== id);
  localStorage.setItem('vpe_history', JSON.stringify(history));
  renderHistory();
  renderFavorites();
}

// =====================================================
//  TEMPLATES
// =====================================================
async function loadTemplates() {
  const list = document.getElementById('templatesList');
  const loading = document.getElementById('templatesLoading');
  try {
    const resp = await fetch(`${API_URL}/templates`);
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    const templates = data.templates || [];
    loading.style.display = 'none';
    list.innerHTML = templates.map(t => `
      <div class="template-item" onclick="useTemplate('${t.prompt.replace(/'/g, "\\'")}')">
        <div class="template-icon">${t.icon}</div>
        <div>
          <div class="template-name">${t.name}</div>
          <div class="template-desc">${t.description}</div>
        </div>
      </div>
    `).join('');
  } catch {
    loading.innerHTML = `<span>⚠️</span><p>Could not load templates.<br/>Backend may be offline.</p>`;
  }
}

function useTemplate(prompt) {
  document.getElementById('promptInput').value = prompt;
  closeSidebar();
  activatePipelineStep(1);
  showToast('📄 Template loaded! Click Analyze to continue.', 'success');
}

// =====================================================
//  PROJECT CONTEXT
// =====================================================
function loadContextForm() {
  if (projectContext.projectName) document.getElementById('ctxProjectName').value = projectContext.projectName;
  if (projectContext.techStack) document.getElementById('ctxTechStack').value = projectContext.techStack;
  if (projectContext.projectType) document.getElementById('ctxProjectType').value = projectContext.projectType;
  if (projectContext.notes) document.getElementById('ctxNotes').value = projectContext.notes;
}

function saveContext() {
  projectContext = {
    projectName: document.getElementById('ctxProjectName').value,
    techStack: document.getElementById('ctxTechStack').value,
    projectType: document.getElementById('ctxProjectType').value,
    notes: document.getElementById('ctxNotes').value,
  };
  localStorage.setItem('vpe_context', JSON.stringify(projectContext));

  if (projectContext.projectName || projectContext.techStack) {
    document.getElementById('contextChipRow').style.display = 'block';
    document.getElementById('contextChip').textContent =
      `🔍 ${projectContext.projectName || 'Project'} · ${projectContext.techStack || ''}`;
  }

  showToast('💾 Project context saved!', 'success');
}

// =====================================================
//  SETTINGS
// =====================================================
function loadSettings() {
  document.getElementById('settingsBackendUrl').value = API_URL.replace('/api', '');
  document.getElementById('settingsProvider').value = AI_PROVIDER;
}

function saveSettings() {
  const url = document.getElementById('settingsBackendUrl').value.replace(/\/+$/, '');
  const provider = document.getElementById('settingsProvider').value;
  API_URL = url + '/api';
  AI_PROVIDER = provider;
  localStorage.setItem('vpe_backend_url', API_URL);
  localStorage.setItem('vpe_ai_provider', provider);

  const saved = document.getElementById('settingsSaved');
  saved.style.display = 'block';
  setTimeout(() => { saved.style.display = 'none'; }, 2500);

  checkBackendStatus();
}

// =====================================================
//  SIDEBAR
// =====================================================
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

document.getElementById('sidebarToggle').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 720) {
    closeSidebar();
  } else {
    // On desktop just close
    sidebar.style.transform = 'translateX(-100%)';
    document.getElementById('mainWrapper').style.marginLeft = '0';
    document.getElementById('menuBtn').style.display = 'block';
  }
});

function switchSidebarTab(tab) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.sidebar-tab-content').forEach(t => t.classList.remove('active'));

  document.getElementById(`nav${capitalize(tab)}`).classList.add('active');
  document.getElementById(`tab${capitalize(tab)}`).classList.add('active');
}

function updateSidebarState(hasResult = false) {
  const section = document.getElementById('sidebarPromptState');
  section.style.display = 'block';

  document.getElementById('sidebarRawPrompt').textContent = currentPrompt || '—';
  document.getElementById('sidebarFinalStatus').textContent =
    hasResult ? `✅ Ready (${currentEnhancedPrompt.split(/\s+/).length} words)` : 'Not generated yet';

  document.getElementById('sidebarCopyBtn').disabled = !hasResult;
  document.getElementById('sidebarSendBtn').disabled = !hasResult;

  document.getElementById('sidebarCopyBtn').onclick = copyResult;
  document.getElementById('sidebarSendBtn').onclick = sendToAI;
}

// =====================================================
//  UTILITIES
// =====================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(24px)'; toast.style.transition = '0.3s ease'; }, 2500);
  setTimeout(() => { container.removeChild(toast); }, 2900);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}