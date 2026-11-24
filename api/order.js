const { randomUUID } = require('node:crypto');

const allowedGenres = new Set(['소설', '에세이', '인문·교양', '경제·자기계발', '과학·역사', '새로운 장르']);
const allowedMoods = new Set(['마음이 편안해지고 싶어요', '이야기에 푹 빠지고 싶어요', '새로운 시각을 얻고 싶어요', '일상에 자극을 받고 싶어요']);

function configuration() {
  const { BOOKSUNGA_PRICE, BOOKSUNGA_BANK, BOOKSUNGA_ACCOUNT, BOOKSUNGA_HOLDER, BOOKSUNGA_ORDER_URL, BOOKSUNGA_ORDER_TOKEN } = process.env;
  const amount = Number(BOOKSUNGA_PRICE);
  if (!Number.isSafeInteger(amount) || amount <= 0 || !BOOKSUNGA_BANK || !BOOKSUNGA_ACCOUNT || !BOOKSUNGA_HOLDER || !BOOKSUNGA_ORDER_TOKEN) return null;
  if (!URL.canParse(BOOKSUNGA_ORDER_URL) || new URL(BOOKSUNGA_ORDER_URL).protocol !== 'https:') return null;
  return {
    payment: { amount, bank: BOOKSUNGA_BANK, account: BOOKSUNGA_ACCOUNT, holder: BOOKSUNGA_HOLDER },
    url: BOOKSUNGA_ORDER_URL,
    token: BOOKSUNGA_ORDER_TOKEN,
  };
}

module.exports = async function order(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const config = configuration();
  if (req.method === 'GET') return res.json({ payment: config?.payment ?? null });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  }
  if (!config) return res.status(503).end();
  const { genres, mood, consent, ...contact } = req.body ?? {};
  if (!Array.isArray(genres) || genres.length < 1 || genres.length > allowedGenres.size ||
      !genres.every((genre) => allowedGenres.has(genre)) || !allowedMoods.has(mood) || consent !== 'on') {
    return res.status(400).end();
  }
  const delivery = {};
  for (const [key, limit] of Object.entries({ name: 50, phone: 30, address: 300, depositor: 50 })) {
    const value = typeof contact[key] === 'string' ? contact[key].trim() : '';
    if (value.length > limit || (!value && key !== 'depositor')) return res.status(400).end();
    delivery[key] = value;
  }
  const id = randomUUID();
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
      body: JSON.stringify({ id, genres: [...new Set(genres)], mood, ...delivery, depositor: delivery.depositor || delivery.name, amount: config.payment.amount, status: 'pending_deposit', createdAt: new Date().toISOString() }),
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) return res.status(201).json({ id });
  } catch {
    return res.status(502).end();
  }
  return res.status(502).end();
};
