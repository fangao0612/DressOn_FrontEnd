export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    const endpointId = process.env.RUNPOD_ENDPOINT_ID;
    const apiKey = process.env.RUNPOD_API_KEY;
    const id = req.query.id;
    if (!endpointId || !apiKey) {
      return res.status(500).json({ error: 'RUNPOD credentials missing' });
    }
    if (!id) {
      return res.status(400).json({ error: 'id_required' });
    }

    const r = await fetch(`https://api.runpod.ai/v2/${endpointId}/status/${encodeURIComponent(id)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const j = await r.json().catch(() => ({}));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(r.ok ? 200 : r.status).json(j);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}


