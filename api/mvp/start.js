export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    const endpointId = process.env.RUNPOD_ENDPOINT_ID;
    const apiKey = process.env.RUNPOD_API_KEY;
    if (!endpointId || !apiKey) {
      return res.status(500).json({ error: 'RUNPOD credentials missing' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const payload = { input: body?.input || {} };

    const resp = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(resp.status).json(j);
    }
    const id = j.id || j.jobId || j?.status?.id;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ id });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}


