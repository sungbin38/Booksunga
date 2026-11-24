const form = document.querySelector('#flow');
const panels = [...form.querySelectorAll('[data-step]')];
const byId = (id) => document.getElementById(id);
const next = byId('next');
const back = byId('back');
const message = byId('message');
const labels = ['장르', '토요일의 책', '서점에서', '독서 유형과 권수', '계좌이체'];
const actions = ['다음 질문', '다음 질문', '내 독서 유형 보기', '계좌이체 안내 보기', '입금 확인 신청'];
let step = 0;
let payment;
let prices;
const money = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' });
const types = {
  'cozy-familiar': ['FC', '포근 복숭아', '익숙한 장르 안에서 오래 곱씹을 문장을 찾는 독자예요.'],
  'cozy-curious': ['NC', '산책 복숭아', '천천히 읽으며 낯선 이야기 속을 둘러보는 독자예요.'],
  'bright-familiar': ['FB', '몰입 복숭아', '좋아하는 장르에서 단숨에 끝까지 읽을 이야기를 찾는 독자예요.'],
  'bright-curious': ['NB', '탐험 복숭아', '처음 보는 장르도 거침없이 펼쳐 새로운 자극을 찾는 독자예요.'],
};

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
    fieldset.disabled = panel.hidden || (step === 4 && !payment);
  });
  byId('step-progress').value = step + 1;
  byId('step-count').textContent = `${step + 1} / ${panels.length} · ${labels[step]}`;
  back.hidden = step === 0;
  next.hidden = step === 4 && !payment;
  next.textContent = actions[step];
  panels[step].querySelector('h3, legend').focus();
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
  const discovery = form.querySelector('[name=discovery]:checked')?.value;
  const quantity = form.querySelector('[name=quantity]:checked')?.value;
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
      showStep(2);
      return;
    }
    if (step === 2) {
      next.textContent = '독서 유형 계산 중…';
      payment = null;
      try {
        const response = await fetch('/api/order', { cache: 'no-store' });
        if (response.ok) payment = (await response.json()).payment;
      } catch {
        // Static preview uses the sample pricing file.
      }
      prices = payment?.prices;
      if (!prices) {
        const sample = await fetch('/plans.json');
        if (!sample.ok) throw new Error('Price list unavailable');
        prices = await sample.json();
      }
      const type = `${mood}-${discovery}`;
      const [code, name, description] = types[type];
      byId('mascot').dataset.type = type;
      byId('type-code').textContent = `${code} · 나의 독서 유형`;
      byId('type-name').textContent = name;
      byId('type-description').textContent = description;
      byId('plan-note').textContent = payment ? '월 구독료 · 배송비 포함' : '월 구독료 예시 · 배송비 포함';
      for (const label of form.querySelectorAll('[data-price]')) {
        label.textContent = money.format(prices[label.dataset.price]);
      }
      showStep(3);
      return;
    }
    if (step === 3) {
      byId('taste').textContent = `${types[`${mood}-${discovery}`][1]} · ${genres.join(' · ')}`;
      byId('price').textContent = `월 ${quantity}권 · ${money.format(prices[quantity])}${payment ? '' : ' (예시)'} · 배송비 포함`;
      byId('bank').hidden = !payment;
      byId('preview').hidden = Boolean(payment);
      byId('delivery').hidden = !payment;
      if (payment) byId('account').textContent = `${payment.bank} ${payment.account} · 예금주 ${payment.holder}`;
      showStep(4);
      return;
    }
    next.textContent = '신청 보내는 중…';
    const fields = Object.fromEntries(new FormData(form));
    const response = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, genres, mood, discovery, quantity }),
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
    message.textContent = step < 4 ? '가격표를 불러오지 못했어요. 다시 시도해 주세요.' : '신청을 보내지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
  } finally {
    next.disabled = false;
    back.disabled = false;
    next.textContent = actions[step];
  }
});
