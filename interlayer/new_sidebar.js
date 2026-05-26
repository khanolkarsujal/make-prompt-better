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
  <section class="rv" data-step="1">
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
      <div class="fg">
        <div class="fi">
          <label class="lb"><div class="ld"></div> Framework</label>
          <div class="sw">
            <div class="fi-i"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg></div>
            <select id="selFW"><option>React</option><option>Vue</option><option>Angular</option><option>Svelte</option><option>Next.js</option><option>Vanilla JS</option></select>
            <div class="chv"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
          </div>
        </div>
        <div class="fi">
          <label class="lb"><div class="ld"></div> Styling</label>
          <div class="sw">
            <div class="fi-i"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg></div>
            <select id="selST"><option>Tailwind CSS</option><option>shadcn/ui</option><option>Vanilla CSS</option><option>CSS Modules</option><option>Styled Components</option></select>
            <div class="chv"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
          </div>
        </div>
        <div class="fi">
          <label class="lb"><div class="ld"></div> Data Layer</label>
          <div class="sw">
            <div class="fi-i"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
            <select id="selDL"><option>REST API</option><option>GraphQL</option><option>SQL Database</option><option>Supabase</option><option>Firebase</option><option>Mock/Static</option></select>
            <div class="chv"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
          </div>
        </div>
        <div class="fi">
          <label class="lb"><div class="ld"></div> Complexity</label>
          <div class="sw">
            <div class="fi-i"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
            <select id="selCX"><option>Production-Ready</option><option>MVP / Prototype</option><option>Enterprise</option><option>Minimal</option></select>
            <div class="chv"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
          </div>
        </div>
      </div>
      <div class="er" id="bErr"></div>
      <button class="bd" id="bBtn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
        <span id="bTxt">Continue to Build</span>
      </button>
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
        <div id="stLoad" style="display:none;width:100%;max-width:290px;flex-direction:column;gap:8px">
          <div class="sk-r"><div class="sk-d"></div><span class="sk-l">Kernel_Processing...</span></div>
          <div class="sk" style="width:100%"></div>
          <div class="sk" style="width:75%;animation-delay:.2s"></div>
          <div class="sk" style="width:88%;animation-delay:.4s"></div>
          <div class="sk" style="width:55%;animation-delay:.6s"></div>
        </div>
        <div id="stRes" style="display:none;width:100%;flex-direction:column;gap:9px">
          <div class="r-ok">[SUCCESS] COMPILATION COMPLETE</div>
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
    <button class="bp" id="rstBtn" style="margin-top:10px;background:var(--z900);box-shadow:none">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.31"/></svg>
      <span>New Prompt</span>
    </button>
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
  const s2=g('s2'),s3=g('s3'),cTi=g('cTi'),iTgs=g('iTgs');
  const bBtn=g('bBtn'),bTxt=g('bTxt'),bErr=g('bErr');
  const stIdle=g('stIdle'),stLoad=g('stLoad'),stRes=g('stRes');
  const rTxt=g('rTxt'),tSt=g('tSt');
  const copyBtn=g('copyBtn'),sendBtn=g('sendBtn'),rstBtn=g('rstBtn');
  const latV=g('latV'),fSt=g('fSt'),scr=g('scr'),spot=g('spot');
  let t0=0;

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
    setTimeout(()=>scr.scrollTo({top:scr.scrollHeight,behavior:'smooth'}),90);
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
  function type(el,txt,spd=11){
    el.textContent='';let i=0;
    const t=setInterval(()=>{if(i<txt.length){el.textContent+=txt[i];i++;}else clearInterval(t);},spd);
  }

  aBtn.addEventListener('click',()=>{
    const p=pi.value.trim();
    if(!p){aErr.textContent='Please enter a prompt first.';aErr.style.display='block';return;}
    aErr.style.display='none';
    aBtn.disabled=true;aTxt.textContent='Analyzing...';
    t0=Date.now();status('Analyzing...',true);
    vscode.postMessage({command:'analyze',prompt:p});
  });

  bBtn.addEventListener('click',()=>{
    bErr.style.display='none';
    bBtn.disabled=true;bTxt.textContent='Building...';
    t0=Date.now();status('Building...',true);
    if(s3.style.display==='none') show(s3);
    term('load');tSt.textContent='STDOUT: COMPILING...';
    vscode.postMessage({command:'build',prompt:pi.value.trim(),
      selections:{framework:g('selFW').value,styling:g('selST').value,
        data:g('selDL').value,complexity:g('selCX').value}});
  });

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
    s2.style.display='none';s2.classList.remove('on');
    s3.style.display='none';s3.classList.remove('on');
    term('idle');tSt.textContent='STDOUT: IDLE';
    dots(1);status('Nominal',true);
    scr.scrollTo({top:0,behavior:'smooth'});
  });

  window.addEventListener('message',e=>{
    const m=e.data;
    switch(m.command){
      case 'analysisStart': break;
      case 'analysisResult':{
        latV.textContent=(Date.now()-t0)+'ms';
        aBtn.disabled=false;aTxt.textContent='Analyze Intent';
        const d=m.data,tags=[];
        if(d.intent) tags.push({l:d.intent,c:'r'});
        if(d.complexity) tags.push({l:d.complexity,c:'dk'});
        if(Array.isArray(d.clarifications))
          d.clarifications.slice(0,3).forEach(c=>tags.push({l:c.substring(0,28),c:''}));
        iTgs.innerHTML=tags.map(t=>'<span class="tg '+t.c+'">'+t.l+'</span>').join('')
          ||'<span class="tg">General prompt</span>';
        if(d.intent) cTi.textContent='CONFIGURING: '+d.intent.toUpperCase().substring(0,22);
        dots(2);status('Analysis done',true);show(s2);break;
      }
      case 'analysisError':
        latV.textContent=(Date.now()-t0)+'ms';
        aBtn.disabled=false;aTxt.textContent='Analyze Intent';
        aErr.textContent='Error: '+m.message;aErr.style.display='block';
        status('Error',false);break;
      case 'buildStart':
        term('load');tSt.textContent='STDOUT: COMPILING...';
        if(s3.style.display==='none') show(s3);break;
      case 'buildResult':{
        latV.textContent=(Date.now()-t0)+'ms';
        bBtn.disabled=false;bTxt.textContent='Continue to Build';
        term('res');tSt.textContent='STDOUT: READY';
        dots(3);status('Build complete',true);
        type(rTxt,m.data.enhanced_prompt||'');break;
      }
      case 'buildError':
        latV.textContent=(Date.now()-t0)+'ms';
        bBtn.disabled=false;bTxt.textContent='Continue to Build';
        term('idle');tSt.textContent='STDOUT: ERROR';
        bErr.textContent='Error: '+m.message;bErr.style.display='block';
        status('Build failed',false);break;
      case 'setPrompt':
        pi.value=m.prompt||'';
        chC.textContent='ch '+(m.prompt||'').length;
        lnC.textContent='ln '+(m.prompt||'').split('\\n').length;break;
      case 'reset': rstBtn.click();break;
    }
  });

  dots(1);
</script>
</body>
</html>\`;}
