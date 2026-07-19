const FORMSUBMIT_AJAX_URL = 'https://formsubmit.co/ajax/';
const SITE_ORIGIN = 'https://landing-page-blue-seven-65.vercel.app';

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

function clean(value, maxLength) {
  return String(value || '').trim().replace(/[\r\n]+/g, ' ').slice(0, maxLength);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const recipient = process.env.CONSULTATION_TO_EMAIL;
  if (!recipient) {
    console.error('CONSULTATION_TO_EMAIL is not configured.');
    return response.status(500).json({ ok: false, message: 'Email delivery is not configured' });
  }

  const params = toSearchParams(request.body);
  if (params.get('bot-field')) {
    return response.status(200).json({ ok: true });
  }

  const studentName = clean(params.get('studentName'), 60);
  const phone = clean(params.get('phone'), 30);
  const grade = clean(params.get('grade'), 40);
  const concern = clean(params.get('concern'), 2000);
  const privacyConsent = clean(params.get('privacyConsent'), 20);

  if (!studentName || !phone || !grade || !concern || !privacyConsent) {
    return response.status(400).json({ ok: false, message: 'Required fields are missing' });
  }

  const submittedAt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'full',
    timeStyle: 'medium'
  }).format(new Date());

  try {
    const formSubmitResponse = await fetch(
      `${FORMSUBMIT_AJAX_URL}${recipient}`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Origin: SITE_ORIGIN,
          Referer: `${SITE_ORIGIN}/`
        },
        body: JSON.stringify({
          _subject: `[아임샘 메타수학] ${studentName} 학생 상담 신청`,
          _template: 'table',
          _captcha: 'false',
          '학생 이름': studentName,
          '연락처': phone,
          '자녀 학년': grade,
          '가장 큰 고민': concern,
          '신청 시각': submittedAt
        })
      }
    );

    const result = await formSubmitResponse.json().catch(() => ({}));
    if (!formSubmitResponse.ok || result.success === 'false' || result.success === false) {
      throw new Error(`FormSubmit returned ${formSubmitResponse.status}: ${JSON.stringify(result)}`);
    }

    return response.status(200).json({ ok: true, delivery: 'formsubmit-email' });
  } catch (error) {
    console.error('Consultation email delivery failed:', error);
    return response.status(502).json({ ok: false, message: 'Unable to send consultation request' });
  }
}
