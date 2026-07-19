const NETLIFY_FORM_URL = process.env.NETLIFY_FORM_URL || 'https://darling-dusk-d93a37.netlify.app/';

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendWithResend(params) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONSULTATION_TO_EMAIL;
  if (!apiKey || !recipient) return false;

  const studentName = params.get('studentName').replace(/[\r\n]/g, ' ').slice(0, 60);
  const submittedAt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'full',
    timeStyle: 'medium'
  }).format(new Date());

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || '아임샘 메타수학 <onboarding@resend.dev>',
      to: [recipient],
      subject: `[아임샘 메타수학] ${studentName} 학생 상담 신청`,
      html: `
        <div style="font-family:Arial,'Apple SD Gothic Neo',sans-serif;max-width:620px;margin:auto;color:#18303d">
          <h2 style="color:#e57145">새로운 학습 상담 신청이 도착했습니다.</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><th style="padding:12px;text-align:left;background:#f7f2e9;border:1px solid #e2ddd3">학생 이름</th><td style="padding:12px;border:1px solid #e2ddd3">${escapeHtml(params.get('studentName'))}</td></tr>
            <tr><th style="padding:12px;text-align:left;background:#f7f2e9;border:1px solid #e2ddd3">연락처</th><td style="padding:12px;border:1px solid #e2ddd3">${escapeHtml(params.get('phone'))}</td></tr>
            <tr><th style="padding:12px;text-align:left;background:#f7f2e9;border:1px solid #e2ddd3">자녀 학년</th><td style="padding:12px;border:1px solid #e2ddd3">${escapeHtml(params.get('grade'))}</td></tr>
            <tr><th style="padding:12px;text-align:left;background:#f7f2e9;border:1px solid #e2ddd3">가장 큰 고민</th><td style="padding:12px;border:1px solid #e2ddd3">${escapeHtml(params.get('concern'))}</td></tr>
            <tr><th style="padding:12px;text-align:left;background:#f7f2e9;border:1px solid #e2ddd3">신청 시각</th><td style="padding:12px;border:1px solid #e2ddd3">${escapeHtml(submittedAt)}</td></tr>
          </table>
          <p style="margin-top:20px;color:#6f7a7e;font-size:12px">Vercel 상담 신청 페이지에서 자동 발송된 메일입니다.</p>
        </div>`
    })
  });

  if (!emailResponse.ok) {
    const detail = await emailResponse.text();
    throw new Error(`Resend returned ${emailResponse.status}: ${detail}`);
  }

  return true;
}

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
  // The current Netlify deployment still defines the legacy `parentName`
  // field. Mirror the student name so Netlify recognizes the submission
  // until the updated form is redeployed there.
  params.set('parentName', params.get('studentName'));
  params.set('subject', params.get('subject') || '아임샘 메타수학 새 상담 신청');

  try {
    const sentDirectly = await sendWithResend(params);
    if (sentDirectly) {
      return response.status(200).json({ ok: true, delivery: 'vercel-email' });
    }

    const netlifyResponse = await fetch(NETLIFY_FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!netlifyResponse.ok) {
      throw new Error(`Netlify form returned ${netlifyResponse.status}`);
    }

    return response.status(200).json({ ok: true, delivery: 'netlify-fallback' });
  } catch (error) {
    console.error('Consultation form forwarding failed:', error);
    return response.status(502).json({ ok: false, message: 'Unable to send consultation request' });
  }
}
