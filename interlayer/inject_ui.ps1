$file = "extension.js"
$lines = Get-Content $file -Encoding UTF8

# Keep everything before line 328 (index 327) and after line 1264 (index 1263)
$before = $lines[0..326]
$after  = $lines[1264..($lines.Length - 1)]

$newFn = @'
function getSidebarHtml(context) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Vibe Prompt Engine</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --red:#f06260;--red-hover:#d95351;
      --z900:#18181b;--z800:#27272a;--z700:#3f3f46;--z600:#52525b;
      --z500:#71717a;--z400:#a1a1aa;--z300:#d4d4d8;--z200:#e4e4e7;
      --z100:#f4f4f5;--z50:#fafafa;--white:#ffffff;
      --shadow-sm:0 1px 3px rgba(0,0,0,.04);
      --shadow-md:0 4px 20px -2px rgba(0,0,0,.06);
      --shadow-lg:0 10px 30px -4px rgba(0,0,0,.10);
      --r:10px;--tr:all .25s cubic-bezier(.4,0,.2,1);
    }
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',system-ui,sans-serif;
      background:#f4f4f5;color:#121212;min-height:100vh;
      -webkit-font-smoothing:antialiased;letter-spacing:-.01em;overflow-x:hidden}
    body::before{content:'';position:fixed;inset:0;
      background-image:radial-gradient(#e4e4e7 .5px,transparent .5px);
      background-size:22px 22px;pointer-events:none;z-index:0}
    #spotlight{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;
      background:radial-gradient(500px circle at var(--mx,50%) var(--my,50%),rgba(240,98,96,.04),transparent 80%);z-index:0}
    .app{position:relative;z-index:1;max-width:660px;margin:0 auto;min-height:100vh;
      background:var(--white);display:flex;flex-direction:column;box-shadow:var(--shadow-lg)}
    .accent{height:3px;background:linear-gradient(90deg,var(--red),var(--z900),var(--red));flex-shrink:0}
    header{padding:14px 18px;border-bottom:1px solid var(--z100);display:flex;align-items:center;
      justify-content:space-between;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);
      position:sticky;top:0;z-index:10;flex-shrink:0}
    .hl{display:flex;align-items:center;gap:11px}
    .logo{width:34px;height:34px;background:var(--z900);border-radius:8px;display:flex;
      align-items:center;justify-content:center;box-shadow:var(--shadow-md);
      transition:transform .2s;cursor:default;flex-shrink:0}
    .logo:hover{transform:scale(1.08) rotate(6deg)}
    .h-title{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:var(--z900)}
    .h-sub{display:flex;align-items:center;gap:5px;margin-top:2px}
    .pdot{width:6px;height:6px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
    .h-ver{font-size:8px;font-family:monospace;font-weight:700;text-transform:uppercase;
      letter-spacing:.08em;color:var(--z500)}
    .hr{display:flex;align-items:center;gap:10px}
    .lat-lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--z500);text-align:right}
    .lat-val{font-size:10px;font-family:monospace;color:var(--z900);font-weight:600}
    .dv{width:1px;height:26px;background:var(--z100)}
    .sdots{display:flex;gap:4px}
    .sdot{width:7px;height:7px;border-radius:50%}
    .scroll{flex:1;overflow-y:auto;padding:20px 18px;display:flex;flex-direction:column;gap:24px;scroll-behavior:smooth}
    .scroll::-webkit-scrollbar{width:3px}
    .scroll::-webkit-scrollbar-track{background:transparent}
    .scroll::-webkit-scrollbar-thumb{background:var(--z200);border-radius:8px}
    .scroll::-webkit-scrollbar-thumb:hover{background:var(--red)}
    .sec-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
    .sbadge{width:38px;height:38px;background:var(--z900);color:var(--white);font-weight:900;
      font-size:13px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .slabel h3{font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:var(--z900)}
    .slabel p{font-size:8px;font-family:monospace;font-weight:700;text-transform:uppercase;
      letter-spacing:.08em;color:var(--z500);margin-top:1px}
    .s-info{font-size:8px;font-family:monospace;font-weight:600;color:var(--z400)}
    .reveal{opacity:0;transform:translateY(14px);
      transition:opacity .6s cubic-bezier(.16,1,.3,1),transform .6s cubic-bezier(.16,1,.3,1)}
    .reveal.visible{opacity:1;transform:none}
    .inp-wrap{background:var(--z50);border:1px solid var(--z200);border-radius:var(--r);
      padding:14px;transition:var(--tr);position:relative}
    .inp-wrap:focus-within{border-color:var(--red);background:var(--white);
      box-shadow:0 0 0 3px rgba(240,98,96,.08)}
    .inp-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .inp-lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:var(--z400)}
    .inp-tty{display:flex;align-items:center;gap:4px;font-size:8px;font-family:monospace;
      font-weight:600;color:var(--z300);text-transform:uppercase}
    textarea#promptInput{width:100%;min-height:120px;background:transparent;border:none;
      outline:none;resize:none;font-family:'JetBrains Mono','Fira Code',monospace;
      font-size:12px;color:var(--z900);line-height:1.6}
    textarea#promptInput::placeholder{color:var(--z300)}
    .inp-foot{display:flex;justify-content:flex-end;gap:5px;margin-top:5px}
    .mbadge{font-size:8px;padding:2px 6px;border-radius:4px;background:var(--z100);
      color:var(--z500);font-family:monospace;font-weight:700;text-transform:uppercase}
    .btn-p{width:100%;margin-top:12px;background:var(--red);color:var(--white);border:none;
      padding:13px 18px;border-radius:8px;font-size:9px;font-weight:900;text-transform:uppercase;
      letter-spacing:.15em;cursor:pointer;display:flex;align-items:center;justify-content:center;
      gap:7px;transition:var(--tr);box-shadow:0 4px 14px rgba(240,98,96,.22)}
    .btn-p:hover{background:var(--red-hover);transform:translateY(-1px);box-shadow:0 6px 20px rgba(240,98,96,.28)}
    .btn-p:active{transform:scale(.98)}
    .btn-p:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .btn-p svg,.btn-p:hover svg{transition:transform .2s}
    .btn-p:hover svg{transform:translateX(3px)}
    .btn-d{width:100%;margin-top:12px;background:var(--z900);color:var(--white);border:none;
      padding:13px 18px;border-radius:8px;font-size:9px;font-weight:900;text-transform:uppercase;
      letter-spacing:.2em;cursor:pointer;display:flex;align-items:center;justify-content:center;
      gap:7px;transition:var(--tr);box-shadow:0 4px 14px rgba(0,0,0,.10)}
    .btn-d:hover{background:var(--red);box-shadow:0 0 20px rgba(240,98,96,.22);transform:translateY(-1px)}
    .btn-d:active{transform:scale(.98)}
    .btn-d:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .sel-card{background:var(--white);border:1px solid var(--z200);border-top:3px solid var(--red);
      border-radius:var(--r);padding:18px;box-shadow:var(--shadow-md);position:relative;
      overflow:hidden;transition:box-shadow .25s}
    .sel-card:hover{box-shadow:var(--shadow-lg)}
    .c-head{display:flex;align-items:center;justify-content:space-between;
      padding-bottom:12px;border-bottom:1px solid var(--z50);margin-bottom:14px}
    .c-title{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:var(--red)}
    .c-id{font-size:8px;font-family:monospace;font-weight:700;color:var(--z300);margin-left:5px}
    .ctx-pill{display:flex;align-items:center;gap:4px;background:var(--z50);
      border:1px solid var(--z100);padding:3px 8px;border-radius:100px}
    .ctx-pill span{font-size:8px;font-family:monospace;font-weight:900;text-transform:uppercase;
      letter-spacing:.08em;color:var(--z500)}
    .tags{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0 14px}
    .tag{font-size:8px;font-family:monospace;font-weight:700;padding:2px 7px;border-radius:4px;
      background:var(--z100);color:var(--z600);text-transform:uppercase;letter-spacing:.05em}
    .tag.red{background:rgba(240,98,96,.09);color:var(--red)}
    .tag.dk{background:var(--z900);color:var(--white)}
    .fgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .ffull{grid-column:1 / -1}
    .fg{display:flex;flex-direction:column;gap:5px}
    .flbl{display:flex;align-items:center;gap:5px;font-size:8px;font-weight:900;
      text-transform:uppercase;letter-spacing:.15em;color:var(--z400)}
    .ldot{width:4px;height:4px;border-radius:50%;background:var(--z300)}
    .fsw{position:relative;border:1px solid var(--z200);border-radius:8px;
      background:var(--z50);display:flex;align-items:center;transition:var(--tr);overflow:hidden}
    .fsw:focus-within{border-color:var(--red);background:var(--white);
      box-shadow:0 0 0 3px rgba(240,98,96,.06)}
    .fsw:focus-within .ficon{color:var(--red)}
    .fsw:focus-within .fchev{transform:rotate(180deg);color:var(--red)}
    .ficon{padding:0 9px;color:var(--z400);transition:color .2s;display:flex;align-items:center;flex-shrink:0}
    .fsw select{flex:1;border:none;background:transparent;outline:none;padding:9px 24px 9px 0;
      font-size:10px;font-family:monospace;font-weight:700;color:var(--z900);
      appearance:none;cursor:pointer}
    .fchev{position:absolute;right:8px;pointer-events:none;color:var(--z400);
      display:flex;transition:transform .25s}
    .err{display:none;background:rgba(240,98,96,.08);border:1px solid rgba(240,98,96,.2);
      border-radius:8px;padding:9px 12px;font-size:10px;font-family:monospace;
      color:var(--red);margin-top:8px}
    .term{border-radius:var(--r);overflow:hidden;background:var(--z900);
      border:1px solid var(--z800);transition:border-color .25s}
    .term:hover{border-color:rgba(240,98,96,.3)}
    .tbar{height:28px;background:var(--z800);display:flex;align-items:center;padding:0 10px;gap:5px}
    .tdot{width:8px;height:8px;border-radius:50%}
    .ttitle{flex:1;text-align:center;font-size:8px;font-family:monospace;font-weight:700;
      text-transform:uppercase;letter-spacing:.18em;color:var(--z500)}
    .tbody{padding:18px;min-height:160px;display:flex;flex-direction:column;align-items:center;
      justify-content:center;position:relative;overflow:hidden}
    .scan{position:absolute;inset:0;background:linear-gradient(to bottom,transparent,rgba(240,98,96,.04),transparent);
      animation:scan 3s linear infinite;pointer-events:none;opacity:.3}
    @keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
    .idle-txt{font-size:11px;font-family:monospace;color:var(--z500);font-style:italic;text-align:center}
    .idle-txt .cr{color:var(--red);opacity:.6}
    .rbadge{display:flex;align-items:center;gap:7px;margin-top:8px}
    .rdot{width:6px;height:6px;border-radius:50%;background:var(--red);animation:pulse 2s infinite}
    .rbadge span{font-size:9px;font-weight:900;color:var(--white);text-transform:uppercase;letter-spacing:.18em}
    .skel-row{display:flex;align-items:center;gap:7px;margin-bottom:4px}
    .skel-dot{width:5px;height:5px;border-radius:50%;background:var(--red);animation:pulse 1.2s infinite;flex-shrink:0}
    .skel-lbl{font-size:8px;font-family:monospace;color:var(--z400);text-transform:uppercase}
    .skel{height:9px;border-radius:4px;
      background:linear-gradient(90deg,#27272a 25%,#3f3f46 50%,#27272a 75%);
      background-size:200% 100%;animation:shimmer 1.8s infinite linear}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    .res-ok{font-size:9px;font-family:monospace;font-weight:700;color:var(--red);margin-bottom:6px}
    #resultText{font-size:11px;font-family:monospace;color:#d4d4d8;line-height:1.65;
      white-space:pre-wrap;word-break:break-word;width:100%}
    .r-acts{display:flex;gap:7px;margin-top:10px;justify-content:center}
    .act-btn{display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:100px;
      border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);
      color:var(--z400);font-size:8px;font-weight:700;text-transform:uppercase;
      letter-spacing:.1em;cursor:pointer;transition:var(--tr)}
    .act-btn:hover{background:var(--red);color:var(--white);border-color:var(--red);transform:translateY(-1px)}
    .tfoot{height:20px;background:var(--z900);border-top:1px solid rgba(255,255,255,.04);
      display:flex;align-items:center;justify-content:space-between;padding:0 10px}
    .tfoot span{font-size:8px;font-family:monospace;font-weight:600;color:var(--z600);
      text-transform:uppercase;letter-spacing:.06em}
    footer{background:var(--z50);border-top:1px solid var(--z100);padding:9px 18px;
      display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .fl{display:flex;align-items:center;gap:12px}
    .fi{display:flex;align-items:center;gap:4px;font-size:8px;font-weight:700;
      text-transform:uppercase;letter-spacing:.12em;color:var(--z400)}
    .fdot{width:4px;height:4px;border-radius:50%;background:var(--z300)}
    .fr{display:flex;align-items:center;gap:5px;font-size:8px;font-weight:700;
      letter-spacing:.1em;text-transform:uppercase}
    .ok{color:#22c55e}
  </style>
</head>
<body>
<div id="spotlight"></div>
<div class="app">
  <div class="accent"></div>

  <!-- HEADER -->
  <header>
    <div class="hl">
      <div class="logo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f06260" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      </div>
      <div>
        <div class="h-title">Vibe Prompt Engine</div>
        <div class="h-sub"><div class="pdot"></div><span class="h-ver">PRECISION_CORE: V2.4.0</span></div>
      </div>
    </div>
    <div class="hr">
      <div><div class="lat-lbl">Latency</div><div class="lat-val" id="latVal">--ms</div></div>
      <div class="dv"></div>
      <div class="sdots">
        <div class="sdot" id="dot0" style="background:#f06260"></div>
        <div class="sdot" id="dot1" style="background:#e4e4e7"></div>
        <div class="sdot" id="dot2" style="background:#e4e4e7"></div>
      </div>
    </div>
  </header>

  <!-- SCROLL BODY -->
  <div class="scroll" id="scr">

    <!-- STEP 01 -->
    <section class="reveal" data-step="1">
      <div class="sec-head">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="sbadge">01</div>
          <div class="slabel"><h3>Raw Prompt</h3><p>INITIATING_SEQUENCE_INPUT</p></div>
        </div>
        <span class="s-info">UTF-8 // STREAM</span>
      </div>
      <div class="inp-wrap">
        <div class="inp-top">
          <span class="inp-lbl">INPUT STREAM</span>
          <div class="inp-tty">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            TTY_READY
          </div>
        </div>
        <textarea id="promptInput" placeholder="e.g. build a high-performance dashboard with real-time charts..."></textarea>
        <div class="inp-foot">
          <span class="mbadge" id="lnCnt">ln 1</span>
          <span class="mbadge" id="chCnt">ch 0</span>
        </div>
      </div>
      <div class="err" id="aErr"></div>
      <button class="btn-p" id="analyzeBtn">
        <span id="aBtnTxt">Analyze Intent</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    </section>

    <!-- STEP 02 -->
    <section class="reveal" data-step="2" id="step2" style="display:none">
      <div class="sec-head">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="sbadge">02</div>
          <div class="slabel"><h3>User Selection</h3><p>PARAM_DETERMINATION</p></div>
        </div>
      </div>
      <div class="sel-card">
        <div style="position:absolute;top:7px;right:7px;display:flex;gap:2px;pointer-events:none">
          <div style="width:4px;height:4px;background:#f4f4f5"></div>
          <div style="width:4px;height:4px;background:#e4e4e7"></div>
          <div style="width:4px;height:4px;background:#f4f4f5"></div>
        </div>
        <div class="c-head">
          <div><span class="c-title" id="cTitle">CONFIGURING: PROMPT</span><span class="c-id">#4412</span></div>
          <div class="ctx-pill"><div class="pdot" style="width:5px;height:5px"></div><span>Context-Aware</span></div>
        </div>
        <div class="flbl" style="margin-bottom:5px"><div class="ldot"></div> Detected Intent</div>
        <div class="tags" id="iTags"><span class="tag">Awaiting analysis...</span></div>
        <div class="fgrid">
          <!-- Framework -->
          <div class="fg">
            <label class="flbl"><div class="ldot"></div> Framework</label>
            <div class="fsw">
              <div class="ficon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg></div>
              <select id="selFramework"><option>React</option><option>Vue</option><option>Angular</option><option>Svelte</option><option>Next.js</option><option>Vanilla JS</option></select>
              <div class="fchev"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
            </div>
          </div>
          <!-- Styling -->
          <div class="fg">
            <label class="flbl"><div class="ldot"></div> Styling</label>
            <div class="fsw">
              <div class="ficon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg></div>
              <select id="selStyling"><option>Tailwind CSS</option><option>shadcn/ui</option><option>Vanilla CSS</option><option>CSS Modules</option><option>Styled Components</option></select>
              <div class="fchev"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
            </div>
          </div>
          <!-- Data Layer -->
          <div class="fg">
            <label class="flbl"><div class="ldot"></div> Data Layer</label>
            <div class="fsw">
              <div class="ficon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
              <select id="selData"><option>REST API</option><option>GraphQL</option><option>SQL Database</option><option>Supabase</option><option>Firebase</option><option>Mock/Static</option></select>
              <div class="fchev"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
            </div>
          </div>
          <!-- Complexity -->
          <div class="fg">
            <label class="flbl"><div class="ldot"></div> Complexity</label>
            <div class="fsw">
              <div class="ficon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
              <select id="selComplexity"><option>Production-Ready</option><option>MVP / Prototype</option><option>Enterprise</option><option>Minimal</option></select>
              <div class="fchev"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
            </div>
          </div>
        </div>
        <div class="err" id="bErr"></div>
        <button class="btn-d" id="buildBtn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          <span id="bBtnTxt">Continue to Build</span>
        </button>
      </div>
    </section>

    <!-- STEP 03 -->
    <section class="reveal" data-step="3" id="step3" style="display:none">
      <div class="sec-head">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="sbadge">03</div>
          <div class="slabel"><h3>Final Prompt</h3><p>TERMINAL_OUTPUT_READY</p></div>
        </div>
      </div>
      <div class="term">
        <div class="tbar">
          <div class="tdot" style="background:rgba(239,68,68,.3)"></div>
          <div class="tdot" style="background:rgba(234,179,8,.3)"></div>
          <div class="tdot" style="background:rgba(34,197,94,.3)"></div>
          <div class="ttitle">Compiler_Ready</div>
        </div>
        <div class="tbody">
          <div class="scan"></div>
          <!-- idle -->
          <div id="sIdle" style="display:flex;flex-direction:column;align-items:center;gap:10px">
            <p class="idle-txt"><span class="cr">&gt;</span> Awaiting build completion...</p>
            <div class="rbadge"><div class="rdot"></div><span>Ready to Transmit</span></div>
          </div>
          <!-- loading -->
          <div id="sLoad" style="display:none;width:100%;max-width:300px;flex-direction:column;gap:9px">
            <div class="skel-row"><div class="skel-dot"></div><span class="skel-lbl">Kernel_Processing...</span></div>
            <div class="skel" style="width:100%"></div>
            <div class="skel" style="width:75%;animation-delay:.2s"></div>
            <div class="skel" style="width:88%;animation-delay:.4s"></div>
            <div class="skel" style="width:55%;animation-delay:.6s"></div>
          </div>
          <!-- result -->
          <div id="sResult" style="display:none;width:100%;flex-direction:column;gap:10px">
            <div class="res-ok">[SUCCESS] COMPILATION COMPLETE</div>
            <div id="resultText"></div>
            <div class="r-acts">
              <button class="act-btn" id="copyBtn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy
              </button>
              <button class="act-btn" id="sendBtn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Send to Editor
              </button>
            </div>
          </div>
        </div>
        <div class="tfoot">
          <span id="tStatus">STDOUT: IDLE</span>
          <span>v2.4.0-stable</span>
        </div>
      </div>
      <button class="btn-p" id="resetBtn" style="margin-top:10px;background:var(--z900);box-shadow:none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.31"/></svg>
        <span>New Prompt</span>
      </button>
    </section>

  </div><!-- /scroll -->

  <!-- FOOTER -->
  <footer>
    <div class="fl">
      <div class="fi"><div class="fdot"></div>Kinetic System</div>
      <div class="fi"><div class="fdot"></div>Precision 1.0</div>
    </div>
    <div class="fr"><span style="color:var(--z400)">Status</span><span class="ok" id="fStatus">Nominal</span></div>
  </footer>
</div>

<script>
  const vscode = acquireVsCodeApi();
  const $  = id => document.getElementById(id);
  const pi = $('promptInput'), chCnt = $('chCnt'), lnCnt = $('lnCnt');
  const aBtn = $('analyzeBtn'), aBtnTxt = $('aBtnTxt'), aErr = $('aErr');
  const step2 = $('step2'), step3 = $('step3');
  const cTitle = $('cTitle'), iTags = $('iTags');
  const bBtn = $('buildBtn'), bBtnTxt = $('bBtnTxt'), bErr = $('bErr');
  const sIdle = $('sIdle'), sLoad = $('sLoad'), sResult = $('sResult');
  const resText = $('resultText'), tStatus = $('tStatus');
  const copyBtn = $('copyBtn'), sendBtn = $('sendBtn'), resetBtn = $('resetBtn');
  const latVal = $('latVal'), fStatus = $('fStatus');
  const scr = $('scr'), spotlight = $('spotlight');
  let t0 = 0;

  // Spotlight
  window.addEventListener('mousemove', e => {
    spotlight.style.setProperty('--mx', e.clientX+'px');
    spotlight.style.setProperty('--my', e.clientY+'px');
  });

  // Reveal on load
  setTimeout(() => {
    document.querySelectorAll('.reveal').forEach((el,i) => {
      if (el.style.display !== 'none')
        setTimeout(() => el.classList.add('visible'), i*120);
    });
  }, 50);

  function revealEl(el) {
    el.style.display = '';
    setTimeout(() => el.classList.add('visible'), 30);
    setTimeout(() => scr.scrollTo({top:scr.scrollHeight,behavior:'smooth'}), 100);
  }

  // Textarea metrics
  pi.addEventListener('input', () => {
    chCnt.textContent = 'ch '+pi.value.length;
    lnCnt.textContent = 'ln '+pi.value.split('\n').length;
  });

  function setDots(n) {
    [$('dot0'),$('dot1'),$('dot2')].forEach((d,i) =>
      d.style.background = i<n ? '#f06260' : '#e4e4e7');
  }
  function setStatus(txt,ok) {
    fStatus.textContent = txt;
    fStatus.style.color = ok ? '#22c55e' : '#f06260';
  }
  function termState(s) {
    sIdle.style.display   = s==='idle'   ? 'flex' : 'none';
    sLoad.style.display   = s==='load'   ? 'flex' : 'none';
    sResult.style.display = s==='result' ? 'flex' : 'none';
  }
  function typeText(el, txt, spd=12) {
    el.textContent=''; let i=0;
    const t=setInterval(()=>{ if(i<txt.length){el.textContent+=txt[i];i++;}else clearInterval(t); },spd);
  }

  // Analyze
  aBtn.addEventListener('click', () => {
    const p = pi.value.trim();
    if (!p) { aErr.textContent='Please enter a prompt first.'; aErr.style.display='block'; return; }
    aErr.style.display='none';
    aBtn.disabled=true; aBtnTxt.textContent='Analyzing...';
    t0=Date.now(); setStatus('Analyzing...', true);
    vscode.postMessage({command:'analyze',prompt:p});
  });

  // Build
  bBtn.addEventListener('click', () => {
    bErr.style.display='none';
    bBtn.disabled=true; bBtnTxt.textContent='Building...';
    t0=Date.now(); setStatus('Building...', true);
    if(step3.style.display==='none') revealEl(step3);
    termState('load'); tStatus.textContent='STDOUT: COMPILING...';
    vscode.postMessage({command:'build', prompt:pi.value.trim(),
      selections:{
        framework:$('selFramework').value, styling:$('selStyling').value,
        data:$('selData').value, complexity:$('selComplexity').value
      }
    });
  });

  // Copy
  copyBtn.addEventListener('click', () => {
    vscode.postMessage({command:'copyPrompt'});
    copyBtn.textContent='Copied!';
    setTimeout(()=>{ copyBtn.innerHTML='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy'; }, 2000);
  });

  // Send
  sendBtn.addEventListener('click', () => {
    vscode.postMessage({command:'sendToAI'});
    setStatus('Sent to editor', true);
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    pi.value=''; chCnt.textContent='ch 0'; lnCnt.textContent='ln 1';
    aBtn.disabled=false; aBtnTxt.textContent='Analyze Intent';
    aErr.style.display='none'; bErr.style.display='none';
    step2.style.display='none'; step2.classList.remove('visible');
    step3.style.display='none'; step3.classList.remove('visible');
    termState('idle'); tStatus.textContent='STDOUT: IDLE';
    setDots(1); setStatus('Nominal', true);
    scr.scrollTo({top:0,behavior:'smooth'});
  });

  // Messages from extension
  window.addEventListener('message', e => {
    const m = e.data;
    switch(m.command) {
      case 'analysisStart': break;
      case 'analysisResult': {
        latVal.textContent=(Date.now()-t0)+'ms';
        aBtn.disabled=false; aBtnTxt.textContent='Analyze Intent';
        const d=m.data, tags=[];
        if(d.intent) tags.push({l:d.intent,c:'red'});
        if(d.complexity) tags.push({l:d.complexity,c:'dk'});
        if(Array.isArray(d.clarifications))
          d.clarifications.slice(0,3).forEach(c=>tags.push({l:c.substring(0,28),c:''}));
        iTags.innerHTML=tags.map(t=>'<span class="tag '+t.c+'">'+t.l+'</span>').join('')
          || '<span class="tag">General prompt</span>';
        if(d.intent) cTitle.textContent='CONFIGURING: '+d.intent.toUpperCase().substring(0,22);
        setDots(2); setStatus('Analysis done', true);
        revealEl(step2); break;
      }
      case 'analysisError':
        latVal.textContent=(Date.now()-t0)+'ms';
        aBtn.disabled=false; aBtnTxt.textContent='Analyze Intent';
        aErr.textContent='Error: '+m.message; aErr.style.display='block';
        setStatus('Error', false); break;
      case 'buildStart':
        termState('load'); tStatus.textContent='STDOUT: COMPILING...';
        if(step3.style.display==='none') revealEl(step3); break;
      case 'buildResult': {
        latVal.textContent=(Date.now()-t0)+'ms';
        bBtn.disabled=false; bBtnTxt.textContent='Continue to Build';
        termState('result'); tStatus.textContent='STDOUT: READY';
        setDots(3); setStatus('Build complete', true);
        typeText(resText, m.data.enhanced_prompt||''); break;
      }
      case 'buildError':
        latVal.textContent=(Date.now()-t0)+'ms';
        bBtn.disabled=false; bBtnTxt.textContent='Continue to Build';
        termState('idle'); tStatus.textContent='STDOUT: ERROR';
        bErr.textContent='Error: '+m.message; bErr.style.display='block';
        setStatus('Build failed', false); break;
      case 'setPrompt':
        pi.value=m.prompt||'';
        chCnt.textContent='ch '+(m.prompt||'').length;
        lnCnt.textContent='ln '+(m.prompt||'').split('\n').length; break;
      case 'reset': resetBtn.click(); break;
    }
  });

  setDots(1);
</script>
</body>
</html>`;}
'@

$combined = $before + $newFn.Split("`n") + $after
[System.IO.File]::WriteAllLines((Resolve-Path $file).Path, $combined)
Write-Host "Done. Lines: $($combined.Length)"
'@
