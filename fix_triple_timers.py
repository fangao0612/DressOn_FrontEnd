#!/usr/bin/env python3
"""Add three independent timers: Total, Flux, and Nano"""

import re

# Read the file
with open('user-flow.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Replace the timer helper section with new multi-timer system
old_timer_section = r'''// ---- timer helpers ----
const startTimes = new WeakMap\(\);
let currentCancel = null; // function to cancel current flow
function startTimer\(sel\) \{
  const panel = \$\(sel\);
  if \(!panel\) return;

  // Clear old timer if exists
  if \(panel\._timer\) \{
    clearInterval\(panel\._timer\);
    panel\._timer = null;
  \}

  const start = Date\.now\(\);
  startTimes\.set\(panel, start\);

  // Log to console instead of DOM
  const stepName = sel\.includes\('canvas1'\) \? 'Step1' : 'Step2';
  console\.log\(`\[\$\{stepName\}\] Timer started`\);

  // Periodic console updates \(every 5 seconds to avoid spam\)
  panel\._timer = setInterval\(\(\) => \{
    const elapsed = \(Date\.now\(\) - start\) / 1000;
    console\.log\(`\[\$\{stepName\}\] Elapsed: \$\{elapsed\.toFixed\(1\)\}s`\);
  \}, 5000\);
\}
function stopTimer\(sel, label\) \{
  const panel = \$\(sel\);
  if \(!panel\) return;

  // Clear timer
  if \(panel\._timer\) \{
    clearInterval\(panel\._timer\);
    panel\._timer = null;
  \}

  const start = startTimes\.get\(panel\);
  if \(start\) \{
    const elapsed = \(\(Date\.now\(\) - start\) / 1000\)\.toFixed\(1\);
    const stepName = sel\.includes\('canvas1'\) \? 'Step1' : 'Step2';
    const message = label \? `\$\{label\} \(\$\{elapsed\}s\)` : `Elapsed: \$\{elapsed\}s`;
    console\.log\(`\[\$\{stepName\}\] \$\{message\}`\);
  \}
\}'''

new_timer_section = '''// ---- timer helpers (multi-timer system) ----
const timerData = new WeakMap(); // stores { total, flux, nano } for each panel
let currentCancel = null; // function to cancel current flow

function startTimer(sel, type = 'total') {
  const panel = $(sel);
  if (!panel) return;

  let timers = timerData.get(panel);
  if (!timers) {
    timers = { total: null, flux: null, nano: null };
    timerData.set(panel, timers);
  }

  const timerKey = type.toLowerCase();
  if (!timers[timerKey]) {
    timers[timerKey] = {};
  }

  const timer = timers[timerKey];

  // Clear old interval if exists
  if (timer.interval) {
    clearInterval(timer.interval);
  }

  timer.startTime = Date.now();
  const stepName = sel.includes('canvas1') ? 'Step1' : 'Step2';
  const timerLabel = type.charAt(0).toUpperCase() + type.slice(1);

  console.log(`[${stepName}] ${timerLabel} timer started`);

  // Periodic updates every 5 seconds
  timer.interval = setInterval(() => {
    const elapsed = (Date.now() - timer.startTime) / 1000;
    console.log(`[${stepName}] ${timerLabel}: ${elapsed.toFixed(1)}s`);
  }, 5000);
}

function stopTimer(sel, type = 'total', label) {
  const panel = $(sel);
  if (!panel) return;

  const timers = timerData.get(panel);
  if (!timers) return;

  const timerKey = type.toLowerCase();
  const timer = timers[timerKey];
  if (!timer) return;

  // Clear interval
  if (timer.interval) {
    clearInterval(timer.interval);
    timer.interval = null;
  }

  if (timer.startTime) {
    const elapsed = ((Date.now() - timer.startTime) / 1000).toFixed(1);
    const stepName = sel.includes('canvas1') ? 'Step1' : 'Step2';
    const timerLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const message = label ? `${timerLabel} ${label} (${elapsed}s)` : `${timerLabel}: ${elapsed}s`;
    console.log(`[${stepName}] ${message}`);
  }
}'''

content = re.sub(old_timer_section, new_timer_section, content, flags=re.MULTILINE | re.DOTALL)

# Step 2: Update onGenerateLook to start total timer at the beginning
# Find the function and add total timer start
old_generate_start = r'''async function onGenerateLook\(\) \{
  if \(currentCancel\) \{ alert\('A generation is already running'\); return; \}
  const mainFile = __mainFile;
  const refFile = __garmentOriginal;
  if \(!mainFile \|\| !refFile\) \{ alert\('Please upload both images first'\); return; \}
  resetCanvas\(targetSel\);
  resetCanvas\(finalSel\);
  __lastMainFile = mainFile;
  __lastGarmentFile = refFile;
  try \{
    setCanvasLoading\(targetSel, 'Running Flux \(half image\)…'\);
    startTimer\(targetSel\);'''

new_generate_start = '''async function onGenerateLook() {
  if (currentCancel) { alert('A generation is already running'); return; }
  const mainFile = __mainFile;
  const refFile = __garmentOriginal;
  if (!mainFile || !refFile) { alert('Please upload both images first'); return; }
  resetCanvas(targetSel);
  resetCanvas(finalSel);
  __lastMainFile = mainFile;
  __lastGarmentFile = refFile;
  try {
    // Start total timer for entire workflow
    startTimer(targetSel, 'total');
    setCanvasLoading(targetSel, 'Running Flux (half image)…');
    startTimer(targetSel, 'flux');'''

content = re.sub(old_generate_start, new_generate_start, content, flags=re.MULTILINE)

# Step 3: Update Flux completion to stop Flux timer
old_flux_complete = r'''__lastHalfBlob = halfBlob;
      __lastMainSig = currSig;
      logStatus\(targetSel, `Flux done\. Half-image size: \$\{halfBlob\.size\} bytes`\);
    \}
    stopTimer\(targetSel, 'Done'\);'''

new_flux_complete = '''__lastHalfBlob = halfBlob;
      __lastMainSig = currSig;
      logStatus(targetSel, `Flux done. Half-image size: ${halfBlob.size} bytes`);
    }
    stopTimer(targetSel, 'flux', 'completed');'''

content = re.sub(old_flux_complete, new_flux_complete, content)

# Step 4: Update step2 NanoBanana to start Nano timer
old_nano_start = r'''if \(!lastHalfBlob\) \{ setCanvasError\(finalSel, 'Half image not ready'\); return; \}
  setCanvasLoading\(finalSel, 'Sending to NanoBanana…'\);
  startTimer\(finalSel\);'''

new_nano_start = '''if (!lastHalfBlob) { setCanvasError(finalSel, 'Half image not ready'); return; }
  setCanvasLoading(finalSel, 'Sending to NanoBanana…');
  startTimer(targetSel, 'nano');'''

content = re.sub(old_nano_start, new_nano_start, content)

# Step 5: Update Nano completion to stop Nano timer and Total timer
old_nano_complete = r'''if \(result\?\.imageBase64\) \{
    stopTimer\(finalSel, 'Done'\);
    setCanvasImage\(finalSel, result\.imageBase64\);'''

new_nano_complete = '''if (result?.imageBase64) {
    stopTimer(targetSel, 'nano', 'completed');
    stopTimer(targetSel, 'total', 'completed');
    setCanvasImage(finalSel, result.imageBase64);'''

content = re.sub(old_nano_complete, new_nano_complete, content)

# Step 6: Update error handlers to stop timers
# Flux error handler
old_flux_error = r'''\} catch \(e\) \{ const msg = e\?\.message \|\| String\(e\); stopTimer\(targetSel, 'Failed'\);'''

new_flux_error = '''} catch (e) { const msg = e?.message || String(e); stopTimer(targetSel, 'flux', 'failed'); stopTimer(targetSel, 'total', 'failed');'''

content = re.sub(old_flux_error, new_flux_error, content)

# Nano error handler
old_nano_error = r'''stopTimer\(finalSel, 'Failed'\); setCanvasError\(finalSel, `Generation failed: \$\{lastError\?\.message'''

new_nano_error = '''stopTimer(targetSel, 'nano', 'failed'); stopTimer(targetSel, 'total', 'failed'); setCanvasError(finalSel, `Generation failed: ${lastError?.message'''

content = re.sub(old_nano_error, new_nano_error, content)

# Step 7: Update step2 refine function timer calls
old_refine_start = r'''async function onRefineStep2\(\) \{
  if \(!step2Result\) \{ alert\('No step2 image to refine'\); return; \}
  const targetSel = '#canvas2';
  try \{
    setCanvasLoading\(targetSel, 'Refining…'\);
    startTimer\(targetSel\);'''

new_refine_start = '''async function onRefineStep2() {
  if (!step2Result) { alert('No step2 image to refine'); return; }
  const targetSel = '#canvas2';
  try {
    setCanvasLoading(targetSel, 'Refining…');
    startTimer(targetSel, 'total');'''

content = re.sub(old_refine_start, new_refine_start, content, flags=re.MULTILINE)

old_refine_complete = r'''const result = await FluxKontext\.refineFlux\(blob, refineOpts\);
    stopTimer\(targetSel, 'Done'\);'''

new_refine_complete = '''const result = await FluxKontext.refineFlux(blob, refineOpts);
    stopTimer(targetSel, 'total', 'completed');'''

content = re.sub(old_refine_complete, new_refine_complete, content)

old_refine_error = r'''\} catch \(e\) \{ const msg = e\?\.message \|\| String\(e\); stopTimer\(targetSel, 'Failed'\); setCanvasError\(targetSel, `Refine failed: \$\{msg\}`\); \}'''

new_refine_error = '''} catch (e) { const msg = e?.message || String(e); stopTimer(targetSel, 'total', 'failed'); setCanvasError(targetSel, `Refine failed: ${msg}`); }'''

content = re.sub(old_refine_error, new_refine_error, content)

# Write back
with open('user-flow.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Triple timer system implemented successfully!")
print("")
print("Timer types:")
print("  1. Total - From clicking Generate Look to final completion")
print("  2. Flux - Flux processing time (step1)")
print("  3. Nano - NanoBanana processing time (step2)")
print("")
print("Console output format:")
print("  [Step1] Total timer started")
print("  [Step1] Flux timer started")
print("  [Step1] Flux completed (8.5s)")
print("  [Step1] Nano timer started")
print("  [Step1] Nano completed (15.2s)")
print("  [Step1] Total completed (23.7s)")
