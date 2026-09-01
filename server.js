const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'calculations.json');

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser('debak-secret-key-2026'));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data file exists
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

// Authentication API
app.post('/api/auth/login', (req, res) => {
  const { name, password } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Lütfen adınızı girin.' });
  }
  if (password !== 'CBD2020') {
    return res.status(401).json({ error: 'Giriş şifresi hatalı.' });
  }

  res.cookie('user_name', name.trim(), {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax'
  });
  res.json({ ok: true, name: name.trim() });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('user_name');
  res.json({ ok: true });
});

app.get('/api/auth/check', (req, res) => {
  const userName = req.cookies.user_name;
  if (userName) {
    res.json({ authenticated: true, name: userName });
  } else {
    res.json({ authenticated: false });
  }
});

// Calculations API
app.get('/api/calculations', (req, res) => {
  const calculations = readCalculations();
  res.json({ calculations });
});

app.post('/api/calculations', (req, res) => {
  const userName = req.cookies.user_name || req.body.savedBy || 'Harun';
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
  } = req.body;

  if (!partName || !partName.trim()) {
    return res.status(400).json({ error: 'Parça adı boş olamaz.' });
  }

  const calculations = readCalculations();
  const newCalculation = {
    id: 'calc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    customerName: customerName || '',
    projectName: formData?.projectName || '',
    partName: partName.trim(),
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

app.patch('/api/calculations', (req, res) => {
  const { id, quoteStatus } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Kayıt ID gereklidir.' });
  }

  const calculations = readCalculations();
  const index = calculations.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Kayıt bulunamadı.' });
  }

  calculations[index].quoteStatus = quoteStatus || '';
  writeCalculations(calculations);

  res.json({ calculation: calculations[index] });
});

// Fallback to index.html for SPA route matching
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Debak Maliyet Hesaplama sunucusu çalışıyor: http://localhost:${PORT}`);
});
