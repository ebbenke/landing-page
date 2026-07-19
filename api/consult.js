const NETLIFY_FORM_URL = process.env.NETLIFY_FORM_URL || 'https://darling-dusk-d93a37.netlify.app/';

function toSearchParams(body) {
  if (typeof body === 'string') return new URLSearchParams(body);

  const params = new URLSearchParams();
  Object.entries(body || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const params = toSearchParams(request.body);
  const requiredFields = ['studentName', 'phone', 'grade', 'concern', 'privacyConsent'];
  const hasAllFields = requiredFields.every((field) => params.get(field)?.trim());

  if (!hasAllFields) {
    return response.status(400).json({ ok: false, message: 'Required fields are missing' });
  }

  if (params.get('bot-field')) {
    return response.status(200).json({ ok: true });
  }

  params.set('form-name', 'parent-consultation');
  params.set('subject', params.get('subject') || '아임샘 메타수학 새 상담 신청');

  try {
    const netlifyResponse = await fetch(NETLIFY_FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!netlifyResponse.ok) {
      throw new Error(`Netlify form returned ${netlifyResponse.status}`);
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Consultation form forwarding failed:', error);
    return response.status(502).json({ ok: false, message: 'Unable to send consultation request' });
  }
}
