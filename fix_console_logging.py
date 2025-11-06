#!/usr/bin/env python3
"""Move progress info and timer from canvas overlay to F12 console"""

import re

# Read the file
with open('user-flow.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern 1: startTimer function
old_startTimer = r'''function startTimer\(sel\) \{
  const panel = \$\(sel\);
  if \(!panel\) return;
  const timerEl = panel\.querySelector\('\.status-timer'\);
  if \(!timerEl\) return;
  // clear old
  if \(panel\._timer\) \{ clearInterval\(panel\._timer\); panel\._timer = null; \}
  const start = Date\.now\(\);
  startTimes\.set\(panel, start\);
  panel\._timer = setInterval\(\(\) => \{
    const elapsed = \(Date\.now\(\) - start\) / 1000;
    timerEl\.textContent = `Elapsed: \$\{elapsed\.toFixed\(1\)\} s`;
  \}, 100\);
\}'''

new_startTimer = '''function startTimer(sel) {
  const panel = $(sel);
  if (!panel) return;

  // Clear old timer if exists
  if (panel._timer) {
    clearInterval(panel._timer);
    panel._timer = null;
  }

  const start = Date.now();
  startTimes.set(panel, start);

  // Log to console instead of DOM
  const stepName = sel.includes('canvas1') ? 'Step1' : 'Step2';
  console.log(`[${stepName}] Timer started`);

  // Periodic console updates (every 5 seconds to avoid spam)
  panel._timer = setInterval(() => {
    const elapsed = (Date.now() - start) / 1000;
    console.log(`[${stepName}] Elapsed: ${elapsed.toFixed(1)}s`);
  }, 5000);
}'''

# Pattern 2: stopTimer function
old_stopTimer = r'''function stopTimer\(sel, label\) \{
  const panel = \$\(sel\);
  if \(!panel\) return;
  if \(panel\._timer\) \{ clearInterval\(panel\._timer\); panel\._timer = null; \}
  const timerEl = panel\.querySelector\('\.status-timer'\);
  const start = startTimes\.get\(panel\);
  if \(timerEl && start\) \{
    const elapsed = \(\(Date\.now\(\) - start\) / 1000\)\.toFixed\(1\);
    timerEl\.textContent = label \? `\$\{label\} \(\$\{elapsed\} s\)` : `Elapsed: \$\{elapsed\} s`;
  \}
\}'''

new_stopTimer = '''function stopTimer(sel, label) {
  const panel = $(sel);
  if (!panel) return;

  // Clear timer
  if (panel._timer) {
    clearInterval(panel._timer);
    panel._timer = null;
  }

  const start = startTimes.get(panel);
  if (start) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const stepName = sel.includes('canvas1') ? 'Step1' : 'Step2';
    const message = label ? `${label} (${elapsed}s)` : `Elapsed: ${elapsed}s`;
    console.log(`[${stepName}] ${message}`);
  }
}'''

# Pattern 3: logStatus function
old_logStatus = r'''function logStatus\(sel, msg, opts\) \{
  const withTime = !opts \|\| opts\.withTime !== false;
  const panel = \$\(sel\);
  if \(!panel\) return;
  let log = panel\.querySelector\('\.status-log'\);
  if \(!log\) \{
    log = document\.createElement\('div'\);
    log\.className = 'status-log';
    log\.style\.marginTop = '12px';
    log\.style\.maxHeight = '180px';
    log\.style\.overflow = 'auto';
    log\.style\.borderTop = '1px dashed rgba\(255,255,255,\.18\)';
    log\.style\.paddingTop = '8px';
    log\.style\.color = '#a3aec2';
    log\.style\.fontSize = '12px';
    log\.style\.textAlign = 'left';
    panel\.appendChild\(log\);
  \}
  const line = document\.createElement\('div'\);
  if \(withTime\) \{
    const ts = new Date\(\)\.toLocaleTimeString\(\);
    line\.textContent = `\$\{ts\} \u00b7 \$\{msg\}`;
  \} else \{
    line\.textContent = `\$\{msg\}`;
  \}
  log\.appendChild\(line\);
  log\.scrollTop = log\.scrollHeight;
\}'''

new_logStatus = '''function logStatus(sel, msg, opts) {
  const withTime = !opts || opts.withTime !== false;
  const stepName = sel.includes('canvas1') ? 'Step1' : 'Step2';

  // Output to browser console instead of DOM
  if (withTime) {
    const ts = new Date().toLocaleTimeString();
    console.log(`[${stepName}] ${ts} · ${msg}`);
  } else {
    console.log(`[${stepName}] ${msg}`);
  }
}'''

# Apply replacements
content = re.sub(old_startTimer, new_startTimer, content, flags=re.MULTILINE)
content = re.sub(old_stopTimer, new_stopTimer, content, flags=re.MULTILINE)
content = re.sub(old_logStatus, new_logStatus, content, flags=re.MULTILINE)

# Write back
with open('user-flow.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Console logging updated successfully!")
print("Modified functions:")
print("  - startTimer(): Now logs to console instead of updating DOM")
print("  - stopTimer(): Now logs to console instead of updating DOM")
print("  - logStatus(): Now logs to console instead of creating DOM elements")
print("")
print("Changes:")
print("  - Timer updates now appear in F12 console every 5 seconds")
print("  - Status messages appear in F12 console with step labels [Step1] or [Step2]")
print("  - All DOM manipulation code removed from these functions")
