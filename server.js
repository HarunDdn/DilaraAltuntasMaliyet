const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'data', 'calculations.json');
const ENV_FILE = path.join(__dirname, '.env');

// ---------------------------------------------------------------------------
// .env yükleyici (ek bağımlılık yok)
// ---------------------------------------------------------------------------
// Biçim: KEY=value · satır başı # yorum · tırnaklar opsiyonel.
// Ortam değişkeni zaten tanımlıysa (IIS / sistem) .env onu ezmez.
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf-8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(ENV_FILE);

// ---------------------------------------------------------------------------
// Yapılandırma — sır tanımlı değilse sunucu başlamaz
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
// İç ağda düz HTTP kullanılıyor. HTTPS'e geçilirse .env içinde COOKIE_SECURE=true yapın.
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';

const missing = [];
if (!APP_PASSWORD) missing.push('APP_PASSWORD');
if (!COOKIE_SECRET) missing.push('COOKIE_SECRET');
if (missing.length) {
  console.error(
    '\nHATA: Zorunlu ortam değişkenleri tanımlı değil: ' + missing.join(', ') + '\n\n' +
    'Çözüm: proje kökünde .env dosyası oluşturun (örnek: .env.example).\n' +
    '  APP_PASSWORD=...\n' +
    '  COOKIE_SECRET=...\n\n' +
    'Güvenlik nedeniyle sunucu başlatılmadı.\n'
  );
  process.exit(1);
}

if (COOKIE_SECRET.length < 24) {
  console.warn('UYARI: COOKIE_SECRET çok kısa. En az 32 karakterlik rastgele bir değer kullanın.');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser(COOKIE_SECRET));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Veri katmanı
// ---------------------------------------------------------------------------
function readCalculations() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading calculations file:', err);
    return [];
  }
}

function writeCalculations(calculations) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(calculations, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing calculations file:', err);
  }
}

// ---------------------------------------------------------------------------
// Kimlik doğrulama
// ---------------------------------------------------------------------------
const COOKIE_OPTIONS = {
  httpOnly: true,
  signed: true,
  sameSite: 'strict',
  secure: COOKIE_SECURE,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 gün
  path: '/'
};

// İmzalı cookie'den kullanıcı adı. İmza geçersizse cookie-parser false döndürür.
function getUserName(req) {
  const value = req.signedCookies && req.signedCookies.user_name;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function requireAuth(req, res, next) {
  const userName = getUserName(req);
  if (!userName) {
    return res.status(401).json({ error: 'Bu işlem için giriş yapmalısınız.' });
  }
  req.userName = userName;
  next();
}

// Sabit süreli şifre karşılaştırması (zamanlama sızıntısına karşı)
function passwordMatches(candidate) {
  const a = Buffer.from(String(candidate ?? ''), 'utf-8');
  const b = Buffer.from(APP_PASSWORD, 'utf-8');
  const len = Math.max(a.length, b.length, 1);
  const pa = Buffer.alloc(len);
  const pb = Buffer.alloc(len);
  a.copy(pa);
  b.copy(pb);
  return crypto.timingSafeEqual(pa, pb) && a.length === b.length;
}

// ---------------------------------------------------------------------------
// Giriş deneme limiti (bellek içi, IP başına)
// ---------------------------------------------------------------------------
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;  // deneme sayacı penceresi
const BLOCK_MS = 15 * 60 * 1000;   // limit aşılınca kilit süresi
const loginAttempts = new Map();   // ip -> { count, windowStart, blockedUntil }

function clientKey(req) {
  return req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function blockedSecondsLeft(key, now) {
  const rec = loginAttempts.get(key);
  if (!rec || !rec.blockedUntil) return 0;
  if (rec.blockedUntil > now) return Math.ceil((rec.blockedUntil - now) / 1000);
  loginAttempts.delete(key);
  return 0;
}

function registerFailure(key, now) {
  const rec = loginAttempts.get(key);
  if (!rec || now - rec.windowStart > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
    return;
  }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.blockedUntil = now + BLOCK_MS;
}

// Eski kayıtları temizle (bellek şişmesini önler)
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of loginAttempts) {
    const stale = now - rec.windowStart > WINDOW_MS;
    const unblocked = !rec.blockedUntil || rec.blockedUntil <= now;
    if (stale && unblocked) loginAttempts.delete(key);
  }
}, WINDOW_MS).unref();

// ---------------------------------------------------------------------------
// Authentication API
// ---------------------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const now = Date.now();
  const key = clientKey(req);

  const wait = blockedSecondsLeft(key, now);
  if (wait) {
    return res.status(429).json({
      error: `Çok fazla hatalı deneme. ${Math.ceil(wait / 60)} dakika sonra tekrar deneyin.`
    });
  }

  const { name, password } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Lütfen adınızı girin.' });
  }

  if (!passwordMatches(password)) {
    registerFailure(key, now);
    const rec = loginAttempts.get(key);
    const left = Math.max(0, MAX_ATTEMPTS - (rec ? rec.count : 0));
    return res.status(401).json({
      error: left > 0 && left <= 3
        ? `Giriş şifresi hatalı. Kalan deneme: ${left}.`
        : 'Giriş şifresi hatalı.'
    });
  }

  loginAttempts.delete(key);
  const cleanName = String(name).trim().slice(0, 80);
  res.cookie('user_name', cleanName, COOKIE_OPTIONS);
  res.json({ ok: true, name: cleanName });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('user_name', {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: COOKIE_SECURE
  });
  res.json({ ok: true });
});

app.get('/api/auth/check', (req, res) => {
  const userName = getUserName(req);
  if (userName) {
    res.json({ authenticated: true, name: userName });
  } else {
    res.json({ authenticated: false });
  }
});

// ---------------------------------------------------------------------------
// Calculations API — tümü giriş gerektirir
// ---------------------------------------------------------------------------
app.get('/api/calculations', requireAuth, (req, res) => {
  const calculations = readCalculations();
  res.json({ calculations });
});

app.post('/api/calculations', requireAuth, (req, res) => {
  // Kaydeden her zaman imzalı cookie'den gelir; gövdedeki savedBy yok sayılır.
  const userName = req.userName;
  const {
    customerName,
    partName,
    articleNo,
    material,
    calculationDate,
    quantity,
    netCost,
    exWorkPrice,
    salePrice,
    expectedRevenue,
    materialAmount,
    formData
  } = req.body || {};

  if (!partName || !String(partName).trim()) {
    return res.status(400).json({ error: 'Parça adı boş olamaz.' });
  }

  const calculations = readCalculations();
  const newCalculation = {
    id: 'calc-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex'),
    customerName: customerName || '',
    projectName: formData?.projectName || '',
    partName: String(partName).trim(),
    savedBy: userName,
    articleNo: articleNo || '',
    material: material || '',
    calculationDate: calculationDate || new Date().toISOString().slice(0, 10),
    quantity: Number(quantity) || 0,
    netCost: Number(netCost) || 0,
    exWorkPrice: Number(exWorkPrice) || 0,
    salePrice: Number(salePrice) || 0,
    expectedRevenue: Number(expectedRevenue) || 0,
    materialAmount: Number(materialAmount) || 0,
    quoteStatus: '',
    formData: formData || {},
    createdAt: new Date().toISOString()
  };

  calculations.unshift(newCalculation);
  writeCalculations(calculations);

  res.json({ calculation: newCalculation });
});

// Arayüzdeki dört seçenek dışında bir durum yazılamaz.
const ALLOWED_QUOTE_STATUS = new Set(['', 'Değerlendirmede', 'Onaylandı', 'Reddedildi']);

app.patch('/api/calculations', requireAuth, (req, res) => {
  const { id, quoteStatus } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'Kayıt ID gereklidir.' });
  }

  const status = quoteStatus || '';
  if (!ALLOWED_QUOTE_STATUS.has(status)) {
    return res.status(400).json({ error: 'Geçersiz teklif durumu.' });
  }

  const calculations = readCalculations();
  const index = calculations.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Kayıt bulunamadı.' });
  }

  calculations[index].quoteStatus = status;
  writeCalculations(calculations);

  res.json({ calculation: calculations[index] });
});

app.delete('/api/calculations/:id', requireAuth, (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    return res.status(400).json({ error: 'Kayıt ID gereklidir.' });
  }

  const calculations = readCalculations();
  const index = calculations.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Kayıt bulunamadı.' });
  }

  const [removed] = calculations.splice(index, 1);
  writeCalculations(calculations);
  console.log(`Kayıt silindi: ${removed.id} (${removed.partName}) — ${req.userName}`);

  res.json({ id: removed.id });
});

// ---------------------------------------------------------------------------
// Bilinmeyen API yolları: HTML değil JSON 404
// ---------------------------------------------------------------------------
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Bilinmeyen API yolu.' });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Hata yakalayıcı — istemciye yığın izi (stack trace) gitmesin
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Geçersiz istek gövdesi.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'İstek gövdesi çok büyük.' });
  }
  res.status(500).json({ error: 'Sunucu hatası.' });
});

app.listen(PORT, () => {
  console.log(`Debak Maliyet Hesaplama sunucusu çalışıyor: http://localhost:${PORT}`);
  console.log(`Cookie secure bayrağı: ${COOKIE_SECURE ? 'açık (HTTPS)' : 'kapalı (HTTP)'}`);
});
