#!/usr/bin/env python3
"""Remove UI elements (timer, attempt, stop button) from loading screen"""

import re

# Read the file
with open('user-flow.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Remove status UI elements from setCanvasLoading function
# Remove the status-meta div (timer and attempt), status-actions div (stop button), and status-log div
old_loading = r'''  <div class="status-meta" style="margin-top:8px;display:flex;justify-content:center;gap:12px;color:#E4C07A;font-size:12px;text-align:center">
    <div class="status-timer">Elapsed: 0\.0 s</div>
    <div class="status-attempt">Attempt: -</div>
  </div>
  <div class="status-actions" style="margin-top:6px;text-align:center">
    <button class="btn-cancel" style="background:#2a3346;color:#e6eefb;border:1px solid rgba\(255,255,255,\.18\);border-radius:6px;padding:4px 10px;cursor:pointer">Stop</button>
  </div>
  <div class="status-log" style="margin-top:12px;max-height:180px;overflow:auto;border-top:1px dashed rgba\(255,255,255,\.18\);padding-top:8px;color:#a3aec2;font-size:12px;text-align:left"></div>'''

new_loading = ''  # Remove all these elements

content = re.sub(old_loading, new_loading, content)

# Step 2: Remove cancel button event listener code from onGenerateLook
old_cancel_step1 = r'''    const panel = document\.querySelector\(targetSel\);
    const cancelBtn = panel\?\.querySelector\('\.btn-cancel'\);
    let cancelReject;
    const cancelPromise = new Promise\(\(_, reject\)=>{ cancelReject = reject; }\);
    currentCancel = \(\) => { try { cancelReject\?\.\(new Error\('Cancelled by user'\)\); } catch {} };
    cancelBtn\?\.addEventListener\('click', \(\)=>{ currentCancel\?\.\(\); logStatus\(targetSel, 'Cancelled by user'\); }\);'''

new_cancel_step1 = '''    // Cancel functionality removed - UI elements moved to F12 console'''

content = re.sub(old_cancel_step1, new_cancel_step1, content)

# Step 3: Remove cancel button code from onRefineStep2
old_cancel_step2 = r'''    const panel = document\.querySelector\(targetSel\);
    const cancelBtn = panel\?\.querySelector\('\.btn-cancel'\);
    let cancelReject; const cancelPromise = new Promise\(\(_, reject\)=>{ cancelReject = reject; }\);
    currentCancel = \(\) => { try { cancelReject\?\.\(new Error\('Cancelled by user'\)\); } catch {} };'''

new_cancel_step2 = '''    // Cancel functionality removed - UI elements moved to F12 console'''

content = re.sub(old_cancel_step2, new_cancel_step2, content)

# Write back
with open('user-flow.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("UI elements removed successfully!")
print("")
print("Removed elements:")
print("  1. .status-timer (Elapsed: 0.0s)")
print("  2. .status-attempt (Attempt: 1/1)")
print("  3. .btn-cancel (Stop button)")
print("  4. .status-log (no longer used)")
print("")
print("Note: All progress info now appears in F12 console only.")
print("Cancel functionality has been removed.")
