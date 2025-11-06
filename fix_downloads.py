#!/usr/bin/env python3
"""Fix download buttons to use fetch blob method"""

import re

# Read the file
with open('user-flow.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match the simple download onclick handler
old_pattern = r'''btn\.onclick = \(\) => \{
        const a = document\.createElement\('a'\);
        a\.href = dataUrl;
        const ts = new Date\(\)\.toISOString\(\)\.replace\(/\[:\.\]/g,'-'\);
        a\.download = `final-\$\{ts\}\.png`;
        document\.body\.appendChild\(a\); a\.click\(\); a\.remove\(\);
      \};'''

# Replacement with async fetch
new_pattern = '''btn.onclick = async () => {
        try {
          let blobUrl = dataUrl;
          if (!dataUrl.startsWith('data:')) {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            blobUrl = URL.createObjectURL(blob);
          }
          const a = document.createElement('a');
          a.href = blobUrl;
          const ts = new Date().toISOString().replace(/[:.]/g,'-');
          a.download = `final-${ts}.png`;
          document.body.appendChild(a); a.click(); a.remove();
          if (!dataUrl.startsWith('data:')) {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
          }
        } catch (error) {
          console.error('[download] Failed:', error);
          alert('Download failed. Please try again.');
        }
      };'''

# Replace all occurrences
content = re.sub(old_pattern, new_pattern, content, flags=re.MULTILINE)

# Also handle the compressed version on line 479
old_compressed = r"btn\.onclick=\(\)=>{ const a=document\.createElement\('a'\); a\.href=r\.imageBase64; const ts=new Date\(\)\.toISOString\(\)\.replace\(/\[:\.\]/g,'-'\); a\.download=`final-\$\{ts\}\.png`; document\.body\.appendChild\(a\); a\.click\(\); a\.remove\(\); }"

new_compressed = "btn.onclick=async()=>{try{let blobUrl=r.imageBase64;if(!r.imageBase64.startsWith('data:')){const response=await fetch(r.imageBase64);const blob=await response.blob();blobUrl=URL.createObjectURL(blob);}const a=document.createElement('a');a.href=blobUrl;const ts=new Date().toISOString().replace(/[:.]/g,'-');a.download=`final-${ts}.png`;document.body.appendChild(a);a.click();a.remove();if(!r.imageBase64.startsWith('data:')){setTimeout(()=>URL.revokeObjectURL(blobUrl),100);}}catch(error){console.error('[download] Failed:',error);alert('Download failed. Please try again.');}}"

content = re.sub(old_compressed, new_compressed, content)

# Also handle the step2 refine download button on line 997
old_step2 = r"btn\.onclick=\(\)=>{ const a=document\.createElement\('a'\); a\.href=result\.imageBase64; const ts=new Date\(\)\.toISOString\(\)\.replace\(/\[:\.\]/g,'-'\); a\.download=`refined-\$\{ts\}\.png`; document\.body\.appendChild\(a\); a\.click\(\); a\.remove\(\); }"

new_step2 = "btn.onclick=async()=>{try{let blobUrl=result.imageBase64;if(!result.imageBase64.startsWith('data:')){const response=await fetch(result.imageBase64);const blob=await response.blob();blobUrl=URL.createObjectURL(blob);}const a=document.createElement('a');a.href=blobUrl;const ts=new Date().toISOString().replace(/[:.]/g,'-');a.download=`refined-${ts}.png`;document.body.appendChild(a);a.click();a.remove();if(!result.imageBase64.startsWith('data:')){setTimeout(()=>URL.revokeObjectURL(blobUrl),100);}}catch(error){console.error('[download] Failed:',error);alert('Download failed. Please try again.');}}"

content = re.sub(old_step2, new_step2, content)

# Write back
with open('user-flow.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Download functions updated successfully!")
print("Modified locations:")
print("  - Line ~309-315: async download with fetch")
print("  - Line ~479: async download with fetch (compressed)")
print("  - Line ~997: step2 refine async download with fetch")
