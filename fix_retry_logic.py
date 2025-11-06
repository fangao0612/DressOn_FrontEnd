#!/usr/bin/env python3
"""Add retry logic to API client for handling Render cold starts"""

import re

# Read the file
with open('sdk/apiClient.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match the httpPost function
old_httpPost = r'''async function httpPost\(path, form\) \{
  const url = `\$\{DEFAULTS\.baseUrl\}\$\{path\}`;
  const resp = await fetch\(url, \{ method: 'POST', body: form, credentials: 'include' \}\);
  if \(!resp\.ok\) \{
    const text = await resp\.text\(\)\.catch\(\(\) => ''\);
    throw new Error\(`POST \$\{path\} failed: \$\{resp\.status\} \$\{text\}`\);
  \}
  const contentType = resp\.headers\.get\('content-type'\) \|\| '';
  if \(contentType\.includes\('application/json'\)\) return await resp\.json\(\);
  return await resp\.text\(\);
\}'''

new_httpPost = '''async function httpPost(path, form, retries = 0) {
  const url = `${DEFAULTS.baseUrl}${path}`;
  const MAX_RETRIES = 2;
  const RETRY_DELAYS = [5000, 10000]; // 5s, 10s

  try {
    const resp = await fetch(url, { method: 'POST', body: form, credentials: 'include' });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      const status = resp.status;

      // Retry on cold start errors (404, 502, 503) but not auth errors (401, 403)
      const shouldRetry = (status === 404 || status === 502 || status === 503) && retries < MAX_RETRIES;

      if (shouldRetry) {
        const delay = RETRY_DELAYS[retries];
        console.warn(`[API] ${path} failed with ${status}, retrying in ${delay/1000}s... (${retries + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return httpPost(path, form, retries + 1);
      }

      throw new Error(`POST ${path} failed: ${status} ${text}`);
    }
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return await resp.json();
    return await resp.text();
  } catch (error) {
    // Network errors (fetch failed completely)
    if (error.message && error.message.includes('Failed to fetch') && retries < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retries];
      console.warn(`[API] ${path} network error, retrying in ${delay/1000}s... (${retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return httpPost(path, form, retries + 1);
    }
    throw error;
  }
}'''

# Replace
content = re.sub(old_httpPost, new_httpPost, content, flags=re.MULTILINE)

# Write back
with open('sdk/apiClient.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("API retry logic added successfully!")
print("Modified: sdk/apiClient.js - httpPost function")
print("- Automatically retries on 404, 502, 503 errors (Render cold start)")
print("- Max 2 retries with 5s and 10s delays")
print("- Does not retry on auth errors (401, 403)")
