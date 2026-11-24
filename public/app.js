const form = document.querySelector('#flow');
const panels = [...form.querySelectorAll('[data-step]')];
const byId = (id) => document.getElementById(id);
const next = byId('next');
const back = byId('back');
const message = byId('message');
const labels = ['장르', '독서 느낌', '계좌이체'];
const actions = ['독서 느낌 고르기', '계좌이체 안내 보기', '입금 확인 신청'];
let step = 0;
let payment;
let dirty = false;
form.addEventListener('input', () => { dirty = true; });
window.addEventListener('beforeunload', (event) => {
  if (dirty) event.preventDefault();
});

function showStep(index) {
  step = index;
  message.textContent = '';
  panels.forEach((panel, panelIndex) => {
    panel.hidden = panelIndex !== step;
    const fieldset = panel.querySelector('fieldset');
    fieldset.disabled = panel.hidden || (step === 2 && !payment);
  });
  byId('step-count').textContent = `${step + 1} / 3 · ${labels[step]}`;
  back.hidden = step === 0;
  next.hidden = step === 2 && !payment;
  next.textContent = actions[step];
  panels[step].querySelector('legend, h3').focus();
}

back.addEventListener('click', () => showStep(step - 1));
byId('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(payment.account);
    message.textContent = '계좌번호를 복사했어요.';
  } catch {
    message.textContent = '계좌번호를 직접 선택해 복사해 주세요.';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const genres = [...form.querySelectorAll('[name=genres]:checked')].map((input) => input.value);
  const mood = form.querySelector('[name=mood]:checked')?.value;
  if (step === 0) {
    if (!genres.length) {
      message.textContent = '좋아하는 장르를 하나 이상 골라주세요.';
      form.querySelector('[name=genres]').focus();
      return;
    }
    showStep(1);
    return;
  }
  next.disabled = true;
  back.disabled = true;
  message.textContent = '';
  try {
    if (step === 1) {
      next.textContent = '결제 안내 불러오는 중…';
      payment = null;
      try {
        const response = await fetch('/api/order', { cache: 'no-store' });
        if (response.ok) payment = (await response.json()).payment;
      } catch {
        // The static preview can run without a payment API.
      }
      byId('taste').textContent = `${genres.join(' · ')} / ${mood}`;
      byId('bank').hidden = !payment;
      byId('preview').hidden = Boolean(payment);
      byId('delivery').hidden = !payment;
      if (payment) {
        byId('price').textContent = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(payment.amount) + ' · 배송비 포함';
        byId('account').textContent = `${payment.bank} ${payment.account} · 예금주 ${payment.holder}`;
      }
      showStep(2);
      return;
    }
    next.textContent = '신청 보내는 중…';
    const fields = Object.fromEntries(new FormData(form));
    const response = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, genres, mood }),
    });
    if (!response.ok) throw new Error('Order submission failed');
    const { id } = await response.json();
    dirty = false;
    form.reset();
    form.hidden = true;
    byId('receipt').textContent = `접수번호 ${id}`;
    byId('done').hidden = false;
    byId('done').querySelector('h3').focus();
  } catch {
    message.textContent = '신청을 보내지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
  } finally {
    next.disabled = false;
    back.disabled = false;
    next.textContent = actions[step];
  }
});
