const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el, index) => {
  el.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  revealObserver.observe(el);
});

const form = document.getElementById('consultForm');
const success = form.querySelector('.form-success');
const errorMessage = form.querySelector('.form-error');
const submitButton = form.querySelector('button[type="submit"]');
const defaultSubmitText = submitButton.innerHTML;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.classList.remove('show');
  submitButton.disabled = true;
  submitButton.textContent = '상담 신청을 전송하고 있습니다…';

  try {
    const formData = new FormData(form);
    if (formData.get('bot-field')) {
      success.classList.add('show');
      return;
    }

    const response = await fetch('https://formsubmit.co/ajax/ebbenke@kakao.com', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        _subject: `[아임샘 메타수학] ${formData.get('studentName')} 학생 상담 신청`,
        _template: 'table',
        _captcha: 'false',
        '학생 이름': formData.get('studentName'),
        '연락처': formData.get('phone'),
        '자녀 학년': formData.get('grade'),
        '가장 큰 고민': formData.get('concern'),
        '개인정보 수집 동의': formData.get('privacyConsent')
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== 'true') {
      throw new Error(result.message || 'Form submission failed');
    }
    success.classList.add('show');
  } catch (error) {
    errorMessage.classList.add('show');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = defaultSubmitText;
  }
});

document.getElementById('resetForm').addEventListener('click', () => {
  form.reset();
  errorMessage.classList.remove('show');
  success.classList.remove('show');
});

document.querySelectorAll('.faq-list details').forEach((detail) => {
  detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    document.querySelectorAll('.faq-list details').forEach((other) => {
      if (other !== detail) other.open = false;
    });
  });
});

const menuButton = document.querySelector('.menu-button');
menuButton.addEventListener('click', () => {
  const isOpen = document.body.classList.toggle('menu-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
});

document.querySelectorAll('.site-header nav a').forEach((link) => {
  link.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '메뉴 열기');
  });
});
