// Formatters
const fmt3 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmt0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

// Default State
const defaultState = {
  customerName: '',
  projectName: '',
  partName: '',
  articleNo: '',
  date: '2026-07-28',
  material: 'PF31-9005',
  volume: 84,
  density: 1.42,
  grossExtra: 7,
  wasteRate: 0.05,
  materialPrice: 3,
  quantity: 150000,
  cavities: 4,
  cycleSeconds: 180,
  moldPrice: 0,
  annualMoldQuantity: 62000,
  amortizationYears: 3,
  machineHourly: 20,
  laborHourly: 8,
  extras: [
    { id: 'paslanmaz-alevlik', name: 'Paslanmaz alevlik', price: 0 },
    { id: 'rastbolzen', name: 'Rastbolzen', price: 0 },
    { id: 'federmutter', name: 'Federmutter', price: 0 },
    { id: 'linse', name: 'Linse', price: 0 },
    { id: 'pim-cakma', name: 'Pim çakma', price: 0 },
    { id: 'bilezik-montaj', name: 'Bilezik montaj', price: 0 }
  ],
  profitRate: 0.20,
  packageQuantity: 120,
  packageCost: 2,
  shipmentQuantity: 3840,
  shipmentCost: 450
};

const emptyState = {
  customerName: '',
  projectName: '',
  partName: '',
  articleNo: '',
  date: '',
  material: '',
  volume: 0,
  density: 0,
  grossExtra: 0,
  wasteRate: 0,
  materialPrice: 0,
  quantity: 0,
  cavities: 0,
  cycleSeconds: 0,
  moldPrice: 0,
  annualMoldQuantity: 0,
  amortizationYears: 0,
  machineHourly: 0,
  laborHourly: 0,
  extras: [],
  profitRate: 0,
  packageQuantity: 0,
  packageCost: 0,
  shipmentQuantity: 0,
  shipmentCost: 0
};

let state = { ...defaultState };
let rawCalculations = [];
let currentUser = 'Harun';

// Utility helper for safe division
function safeDiv(num, den) {
  return den ? num / den : 0;
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupLoginGate();
  setupFormListeners();
  setupButtons();
  checkAuthAndLoad();
});

// Authentication Handling
async function checkAuthAndLoad() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (data.authenticated) {
      currentUser = data.name;
      showAppScreen();
    } else {
      showLoginScreen();
    }
  } catch {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('login-gate').style.display = 'grid';
  document.getElementById('app-root').style.display = 'none';
}

function showAppScreen() {
  document.getElementById('login-gate').style.display = 'none';
  document.getElementById('app-root').style.display = 'block';

  // Restore local storage state if present
  const saved = localStorage.getItem('maliyet-formu');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...defaultState, ...parsed };
    } catch {}
  }
  populateFormFields();
  recalculate();
  fetchServerCalculations();
}

function setupLoginGate() {
  const form = document.getElementById('login-form');
  const errEl = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';
    loginBtn.disabled = true;
    loginBtn.textContent = 'Kontrol ediliyor…';

    const name = document.getElementById('login-name').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Giriş yapılamadı.');

      currentUser = data.name;
      showAppScreen();
    } catch (err) {
      errEl.textContent = err.message || 'Giriş yapılamadı.';
      errEl.style.display = 'block';
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Programa giriş yap';
    }
  });
}

// Form Field Synchronization
function populateFormFields() {
  const fields = [
    'customerName', 'projectName', 'partName', 'articleNo', 'date', 'material',
    'volume', 'density', 'grossExtra', 'wasteRate', 'materialPrice', 'quantity',
    'cavities', 'cycleSeconds', 'moldPrice', 'annualMoldQuantity', 'amortizationYears',
    'machineHourly', 'laborHourly', 'profitRate', 'packageQuantity', 'packageCost',
    'shipmentQuantity', 'shipmentCost'
  ];

  fields.forEach(field => {
    const el = document.getElementById(`inp-${field}`);
    if (!el) return;
    if (field === 'wasteRate' || field === 'profitRate') {
      el.value = state[field] === 0 ? '' : (state[field] * 100);
    } else {
      el.value = state[field] === 0 ? '' : state[field];
    }
  });

  renderExtras();
}

function setupFormListeners() {
  const fields = [
    'customerName', 'projectName', 'partName', 'articleNo', 'date', 'material',
    'volume', 'density', 'grossExtra', 'wasteRate', 'materialPrice', 'quantity',
    'cavities', 'cycleSeconds', 'moldPrice', 'annualMoldQuantity', 'amortizationYears',
    'machineHourly', 'laborHourly', 'profitRate', 'packageQuantity', 'packageCost',
    'shipmentQuantity', 'shipmentCost'
  ];

  fields.forEach(field => {
    const el = document.getElementById(`inp-${field}`);
    if (!el) return;

    el.addEventListener('input', (e) => {
      let val = e.target.value;
      if (el.type === 'number') {
        let numVal = Number(val);
        if (field === 'wasteRate' || field === 'profitRate') {
          state[field] = numVal / 100;
        } else {
          state[field] = numVal;
        }
      } else {
        state[field] = val;
      }
      recalculate();
    });
  });

  document.getElementById('search-input').addEventListener('input', renderTable);
}

// Dynamic Extra Items
function renderExtras() {
  const container = document.getElementById('extras-container');
  container.innerHTML = '';

  state.extras.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'extra-row';
    row.innerHTML = `
      <label>
        <span>Parça / operasyon adı</span>
        <input type="text" value="${escapeHtml(item.name)}" placeholder="Ek kalem ${index + 1}" data-id="${item.id}" data-type="name" />
      </label>
      <label>
        <span>Birim fiyat</span>
        <div class="input-wrap">
          <input type="number" min="0" step="0.001" value="${item.price === 0 ? '' : item.price}" data-id="${item.id}" data-type="price" />
          <b>EUR/ad.</b>
        </div>
      </label>
      <button type="button" class="remove-extra" aria-label="Sil" data-id="${item.id}">Sil</button>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const id = e.target.getAttribute('data-id');
      const type = e.target.getAttribute('data-type');
      const val = e.target.value;

      state.extras = state.extras.map(ex => {
        if (ex.id === id) {
          return { ...ex, [type]: type === 'price' ? Number(val) : val };
        }
        return ex;
      });
      recalculate();
    });
  });

  container.querySelectorAll('.remove-extra').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      state.extras = state.extras.filter(ex => ex.id !== id);
      renderExtras();
      recalculate();
    });
  });
}

// Calculation Engine
function recalculate() {
  const netWeight = state.volume * state.density;
  const grossWeight = netWeight + state.grossExtra;
  const materialTotal = 0.10 * state.quantity * grossWeight * (1 + state.wasteRate) * state.materialPrice / 1000;
  const rawMaterial = grossWeight * (1 + state.wasteRate) * state.materialPrice / 1000;
  const mold = safeDiv(state.moldPrice, state.annualMoldQuantity * state.amortizationYears);
  const machineLabor = safeDiv((state.machineHourly + state.laborHourly) * state.cycleSeconds, 3600 * state.cavities);
  const interest = safeDiv(materialTotal, state.quantity);
  const baseCost = rawMaterial + mold + machineLabor + interest;

  const extrasSum = state.extras.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
  const subtotal = baseCost + extrasSum;
  const exWork = subtotal * (1 + state.profitRate);
  const packaging = safeDiv(state.packageCost, state.packageQuantity);
  const freight = safeDiv(state.shipmentCost, state.shipmentQuantity);
  const salePrice = exWork + packaging + freight;
  const revenue = salePrice * state.quantity;
  const materialAmount = netWeight * (1 + state.wasteRate) * state.materialPrice * state.quantity / 1000;

  // DOM Updates
  document.getElementById('res-netWeight').textContent = fmt3.format(netWeight);
  document.getElementById('res-grossWeight').textContent = fmt3.format(grossWeight);
  document.getElementById('res-materialTotal').textContent = fmt0.format(materialTotal);
  document.getElementById('res-extrasTotal').textContent = fmt3.format(extrasSum);
  document.getElementById('res-packaging').textContent = fmt3.format(packaging);
  document.getElementById('res-freight').textContent = fmt3.format(freight);

  document.getElementById('sum-base-cost').textContent = `${fmt3.format(baseCost)} € / ad.`;
  document.getElementById('sum-ex-work').textContent = `${fmt3.format(exWork)} € / ad.`;
  document.getElementById('sum-sale-price').textContent = `${fmt3.format(salePrice)} € / ad.`;
  document.getElementById('sum-revenue').textContent = `${fmt0.format(revenue)} €`;

  document.getElementById('p-rawMaterial').textContent = `${fmt3.format(rawMaterial)} €`;
  document.getElementById('p-mold').textContent = `${fmt3.format(mold)} €`;
  document.getElementById('p-machineLabor').textContent = `${fmt3.format(machineLabor)} €`;
  document.getElementById('p-interest').textContent = `${fmt3.format(interest)} €`;
  document.getElementById('p-baseCost').textContent = `${fmt3.format(baseCost)} €`;
  document.getElementById('p-extras').textContent = `${fmt3.format(extrasSum)} €`;
  document.getElementById('p-subtotal').textContent = `${fmt3.format(subtotal)} €`;
  
  document.getElementById('p-profitLabel').textContent = `Kâr payı (%${(state.profitRate * 100).toLocaleString('tr-TR')})`;
  document.getElementById('p-profitAmount').textContent = `${fmt3.format(exWork - subtotal)} €`;
  document.getElementById('p-exWork').textContent = `${fmt3.format(exWork)} €`;
  document.getElementById('p-packaging').textContent = `${fmt3.format(packaging)} €`;
  document.getElementById('p-freight').textContent = `${fmt3.format(freight)} €`;
  document.getElementById('p-salePrice').textContent = `${fmt3.format(salePrice)} €`;
  document.getElementById('p-revenue').textContent = `${fmt0.format(revenue)} €`;
  document.getElementById('p-materialAmount').textContent = `${fmt0.format(materialAmount)} €`;

  return {
    netWeight, grossWeight, materialTotal, rawMaterial, mold, machineLabor,
    interest, baseCost, extrasSum, subtotal, exWork, packaging, freight,
    salePrice, revenue, materialAmount
  };
}

// Action Buttons
function setupButtons() {
  document.getElementById('btn-clear').addEventListener('click', () => {
    if (confirm('Formdaki tüm sarı giriş alanları temizlenecek. Devam edilsin mi?')) {
      state = { ...emptyState };
      localStorage.removeItem('maliyet-formu');
      populateFormFields();
      recalculate();
      const saveStateEl = document.getElementById('save-state');
      saveStateEl.style.display = 'none';
    }
  });

  document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btn-save-local').addEventListener('click', () => {
    localStorage.setItem('maliyet-formu', JSON.stringify(state));
    const now = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    const saveStateEl = document.getElementById('save-state');
    saveStateEl.textContent = `Kaydedildi · ${now}`;
    saveStateEl.style.display = 'inline-block';
  });

  document.getElementById('btn-add-extra').addEventListener('click', () => {
    state.extras.push({ id: 'ek-' + Date.now(), name: '', price: 0 });
    renderExtras();
    recalculate();
  });

  document.getElementById('btn-save-server').addEventListener('click', async () => {
    if (!state.partName || !state.partName.trim()) {
      showRecordMessage('Önce parçanın adını girin.');
      document.getElementById('inp-partName')?.focus();
      return;
    }

    const saveBtn = document.getElementById('btn-save-server');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Ekleniyor…';
    showRecordMessage('');

    const calcResults = recalculate();

    try {
      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: state.customerName,
          partName: state.partName,
          articleNo: state.articleNo,
          material: state.material,
          calculationDate: state.date,
          quantity: state.quantity,
          netCost: calcResults.baseCost,
          exWorkPrice: calcResults.exWork,
          salePrice: calcResults.salePrice,
          expectedRevenue: calcResults.revenue,
          materialAmount: calcResults.materialAmount,
          formData: state
        })
      });
      if (res.status === 401) return handleUnauthorized();
      const data = await res.json();
      if (!res.ok || !data.calculation) throw new Error(data.error || 'Kayıt eklenemedi.');

      rawCalculations.unshift(data.calculation);
      renderTable();
      showRecordMessage('Hesaplama ortak listeye eklendi.');
    } catch (err) {
      showRecordMessage(err.message || 'Kayıt eklenemedi.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Ortak listeye ekle';
    }
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  });

  document.getElementById('btn-refresh-list').addEventListener('click', () => {
    fetchServerCalculations();
  });

  document.getElementById('btn-export-excel').addEventListener('click', exportToExcel);
}

// Oturum düştüyse (401) giriş ekranına dön.
function handleUnauthorized() {
  rawCalculations = [];
  showLoginScreen();
  const errEl = document.getElementById('login-error');
  if (errEl) {
    errEl.textContent = 'Oturumunuz sona erdi. Lütfen yeniden giriş yapın.';
    errEl.style.display = 'block';
  }
}

// Server Calculations List
async function fetchServerCalculations() {
  try {
    const res = await fetch('/api/calculations', { cache: 'no-store' });
    if (res.status === 401) return handleUnauthorized();
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kayıtlar alınamadı.');
    rawCalculations = data.calculations || [];
    renderTable();
  } catch (err) {
    showRecordMessage(err.message || 'Kayıtlar alınamadı.');
  }
}

function showRecordMessage(msg) {
  const el = document.getElementById('record-message');
  if (msg) {
    el.textContent = msg;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

function renderTable() {
  const tbody = document.getElementById('records-tbody');
  const searchVal = document.getElementById('search-input').value.trim().toLocaleLowerCase('tr-TR');

  const filtered = rawCalculations.filter(item => {
    if (!searchVal) return true;
    const searchTarget = [item.customerName, item.projectName, item.partName, item.articleNo, item.material]
      .join(' ').toLocaleLowerCase('tr-TR');
    return searchTarget.includes(searchVal);
  });

  // Group by Project
  const groupsMap = new Map();
  filtered.forEach(rec => {
    const key = `${(rec.customerName || '').trim().toLocaleLowerCase('tr-TR')}\0${(rec.projectName || '').trim().toLocaleLowerCase('tr-TR')}`;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        customerName: rec.customerName || 'Müşteri belirtilmemiş',
        projectName: rec.projectName || 'Proje belirtilmemiş',
        records: []
      });
    }
    groupsMap.get(key).records.push(rec);
  });

  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => 
    a.projectName.localeCompare(b.projectName, 'tr') || a.customerName.localeCompare(b.customerName, 'tr')
  );

  tbody.innerHTML = '';

  if (sortedGroups.length === 0) {
    tbody.innerHTML = `<tr><td colSpan="14" class="empty-records">${rawCalculations.length === 0 ? 'Henüz ortak listeye kaydedilmiş bir hesaplama yok.' : 'Aramanızla eşleşen kayıt bulunamadı.'}</td></tr>`;
    return;
  }

  sortedGroups.forEach(group => {
    // Project Group Header Row
    const groupRow = document.createElement('tr');
    groupRow.className = 'project-group-row';
    groupRow.innerHTML = `
      <td colSpan="14">
        <strong>${escapeHtml(group.projectName)}</strong>
        <span>${escapeHtml(group.customerName)} · ${group.records.length} parça</span>
      </td>
    `;
    tbody.appendChild(groupRow);

    // Records
    group.records.forEach(rec => {
      const recRow = document.createElement('tr');
      recRow.className = 'project-record-row';
      recRow.innerHTML = `
        <td class="grouped-name">${escapeHtml(rec.customerName || '—')}</td>
        <td class="grouped-name">${escapeHtml(rec.projectName || '—')}</td>
        <td><strong>${escapeHtml(rec.partName)}</strong></td>
        <td>${escapeHtml(rec.savedBy || '—')}</td>
        <td>${escapeHtml(rec.articleNo || '—')}</td>
        <td>${escapeHtml(rec.material || '—')}</td>
        <td>${formatDate(rec.calculationDate)}</td>
        <td class="number-cell">${fmt0.format(rec.quantity)}</td>
        <td class="number-cell">${fmt3.format(rec.netCost)} €</td>
        <td class="number-cell">${fmt3.format(rec.exWorkPrice)} €</td>
        <td class="number-cell sale-cell">${fmt3.format(rec.salePrice)} €</td>
        <td class="number-cell">${fmt0.format(rec.expectedRevenue)} €</td>
        <td>
          <div class="status-editor">
            <select data-id="${rec.id}">
              <option value="" ${!rec.quoteStatus ? 'selected' : ''}>Durum seçin</option>
              <option value="Değerlendirmede" ${rec.quoteStatus === 'Değerlendirmede' ? 'selected' : ''}>1 — Değerlendirmede</option>
              <option value="Onaylandı" ${rec.quoteStatus === 'Onaylandı' ? 'selected' : ''}>2 — Onaylandı</option>
              <option value="Reddedildi" ${rec.quoteStatus === 'Reddedildi' ? 'selected' : ''}>3 — Reddedildi</option>
            </select>
            <button type="button" class="status-save" data-id="${rec.id}">Kaydet</button>
            <button type="button" class="status-delete" data-id="${rec.id}" title="Kaydı ortak listeden sil">Sil</button>
          </div>
        </td>
        <td>
          <div class="table-actions">
            <button type="button" class="table-action btn-load-form" data-id="${rec.id}">Formu aç</button>
            <button type="button" class="table-action quote-action btn-create-quote" data-id="${rec.id}">Teklif oluştur</button>
          </div>
        </td>
      `;
      tbody.appendChild(recRow);
    });
  });

  // Attach Event Handlers for Table Buttons
  tbody.querySelectorAll('.status-save').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const select = tbody.querySelector(`select[data-id="${id}"]`);
      const quoteStatus = select.value;
      
      e.target.disabled = true;
      e.target.textContent = '…';
      try {
        const res = await fetch('/api/calculations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, quoteStatus })
        });
        if (res.status === 401) return handleUnauthorized();
        const data = await res.json();
        if (!res.ok || !data.calculation) throw new Error(data.error || 'Teklif durumu kaydedilemedi.');

        rawCalculations = rawCalculations.map(c => c.id === id ? data.calculation : c);
        showRecordMessage('Teklif durumu ortak kayda işlendi.');
      } catch (err) {
        showRecordMessage(err.message || 'Teklif durumu kaydedilemedi.');
      } finally {
        e.target.disabled = false;
        e.target.textContent = 'Kaydet';
      }
    });
  });

  tbody.querySelectorAll('.status-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const item = rawCalculations.find(c => c.id === id);
      if (!item) return;
      if (!window.confirm(`"${item.partName}" kaydı ortak listeden kalıcı olarak silinecek. Onaylıyor musunuz?`)) return;

      e.target.disabled = true;
      e.target.textContent = '…';
      try {
        const res = await fetch(`/api/calculations/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (res.status === 401) return handleUnauthorized();
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Kayıt silinemedi.');

        rawCalculations = rawCalculations.filter(c => c.id !== id);
        renderTable();
        showRecordMessage(`${item.partName} ortak listeden silindi.`);
      } catch (err) {
        showRecordMessage(err.message || 'Kayıt silinemedi.');
        e.target.disabled = false;
        e.target.textContent = 'Sil';
      }
    });
  });

  tbody.querySelectorAll('.btn-load-form').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const item = rawCalculations.find(c => c.id === id);
      if (item && item.formData) {
        state = { ...defaultState, ...item.formData, customerName: item.customerName, projectName: item.projectName };
        populateFormFields();
        recalculate();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showRecordMessage(`${item.partName} form alanlarına yüklendi.`);
      }
    });
  });

  tbody.querySelectorAll('.btn-create-quote').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const item = rawCalculations.find(c => c.id === id);
      if (item) createQuoteDocument(item);
    });
  });
}

// Quote PDF Generator
function createQuoteDocument(record) {
  const norm = str => (str || '').trim().toLocaleLowerCase('tr-TR');
  const custName = norm(record.customerName);
  const projName = norm(record.projectName);

  const matched = rawCalculations.filter(c => norm(c.customerName) === custName && norm(c.projectName) === projName);
  if (!matched.length) {
    showRecordMessage('Teklif için uygun kayıt bulunamadı.');
    return;
  }

  const todayStr = new Intl.DateTimeFormat('tr-TR').format(new Date());
  const company = record.customerName || '—';
  const project = record.projectName || '—';
  const isLandscape = matched.length > 3;

  const fontDef = Math.max(6.5, 10.5 - Math.max(0, matched.length - 3) * 0.55);
  const padDef = Math.max(2, 7 - Math.max(0, matched.length - 3) * 0.6);

  const htmlContent = `
    <section class="quote-page ${isLandscape ? 'landscape' : ''}">
      <header>
        <img src="${window.location.origin}/debak-logo.jpg" alt="Debak">
        <h1>DENİZLİ BAGALİT, KALIP SANAYİ VE TİCARET A.Ş.</h1>
        <p>Denizli Organize Sanayi Bölgesi Mah. Şehit Astsubay Ömer Halisdemir Caddesi No:16-18<br>
        20330- Honaz / <b>Denizli-TR</b><br>
        ☎ +90 258 371 47 78 &nbsp; FAX +90 258 371 59 80<br>
        www.debak.com.tr</p>
      </header>
      <p class="date">Denizli, ${escapeHtml(todayStr)}</p>
      <div class="customer"><span>Company</span><strong>${escapeHtml(company)}</strong></div>
      <p>Dear Mrs.,</p>
      <p>We kindly provide our quote for project <b>${escapeHtml(project)}</b> as below;</p>
      <table>
        <tbody>
          ${[
            ['Part Name', e => e.partName || '—'],
            ['Article No', e => e.articleNo || '—'],
            ['Material Grade', e => e.material || '—'],
            ['Tooling Cavity', e => e.formData?.cavities || '—'],
            ['Tooling Cost [€]', e => fmt3.format(e.formData?.moldPrice || 0)],
            ['Part Cost [€]', e => fmt3.format(e.salePrice)]
          ].map(([title, getter]) => `
            <tr>
              <th>${title}</th>
              ${matched.map(m => `<td>${escapeHtml(getter(m))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p>We hope to meet your expectations.</p>
      <p>Best regards</p>
    </section>
  `;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    showRecordMessage('Teklif penceresi açılamadı. Tarayıcıdaki açılır pencere iznini kontrol edin.');
    return;
  }

  printWin.opener = null;
  printWin.document.write(`<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(company)} - ${escapeHtml(project)} Quote</title>
    <style>
      @page { size: Letter ${isLandscape ? 'landscape' : 'portrait'}; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; background: #ececec; }
      .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: center; gap: 10px; padding: 12px; background: #173927; }
      .toolbar button { border: 0; border-radius: 7px; padding: 10px 17px; color: #173927; background: white; font-weight: 700; cursor: pointer; }
      .quote-page { position: relative; width: 8.5in; min-height: 11in; margin: 18px auto; padding: .82in .82in .7in; background: white; }
      .quote-page.landscape { width: 11in; min-height: 8.5in; padding: .58in .65in .48in; }
      header { position: relative; color: #42556e; }
      header img { position: absolute; right: 0; top: -.35in; width: 1.2in; height: auto; }
      header h1 { margin: 0 0 3px; color: #080b91; font-size: 20pt; letter-spacing: .02em; white-space: nowrap; }
      header p { margin: 0; font-size: 10.5pt; line-height: 1.24; }
      .date { margin: 15px 0 26px; text-align: right; }
      .customer { min-height: 66px; margin-bottom: 28px; }
      .customer span, .customer strong { display: block; }
      .customer strong { margin-top: 4px; }
      p { font-size: 11.5pt; line-height: 1.4; }
      table { width: 100%; margin: 15px 0 15px; border-collapse: collapse; table-layout: fixed; }
      th, td { height: 35px; border: 1px solid #222; padding: ${padDef}px; font-size: ${fontDef}pt; line-height: 1.15; vertical-align: middle; overflow-wrap: anywhere; }
      th { width: ${isLandscape ? '18%' : '24%'}; text-align: right; font-weight: 700; }
      @media print {
        body { background: white; }
        .toolbar { display: none; }
        .quote-page { margin: 0; box-shadow: none; }
      }
    </style></head><body>
    <div class="toolbar"><button onclick="window.print()">Yazdır / PDF olarak kaydet</button><button onclick="window.close()">Kapat</button></div>
    ${htmlContent}
    </body></html>`);

  printWin.document.close();
  showRecordMessage(`${company} / ${project} için ${matched.length} parçalı teklif hazırlandı.`);
}

// Excel CSV Exporter
function exportToExcel() {
  if (!rawCalculations.length) {
    showRecordMessage("Excel'e aktarılacak kayıt bulunamadı.");
    return;
  }

  const clean = val => {
    let str = String(val ?? '');
    return /^[=+\-@]/.test(str) ? `'${str}` : str;
  };
  const quoteStr = val => `"${clean(val).replaceAll('"', '""')}"`;
  const numStr = val => Number(val || 0).toLocaleString('tr-TR', { useGrouping: false, maximumFractionDigits: 6 });

  const rows = [
    ['Müşteri', 'Proje', 'Parça', 'Kaydeden', 'Artikel No', 'Malzeme', 'Tarih', 'Adet', 'Net Maliyet (EUR)', 'EX-WORK (EUR)', 'Satış Fiyatı (EUR)', 'Beklenen Ciro (EUR)', 'Malzeme Tutarı (EUR)', 'Teklif Durumu'],
    ...rawCalculations.map(c => [
      c.customerName, c.projectName, c.partName, c.savedBy, c.articleNo, c.material,
      c.calculationDate, String(c.quantity), numStr(c.netCost), numStr(c.exWorkPrice),
      numStr(c.salePrice), numStr(c.expectedRevenue), numStr(c.materialAmount), c.quoteStatus
    ])
  ];

  const csvContent = '\uFEFF' + rows.map(r => r.map(quoteStr).join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Debak_Hesaplama_Listesi_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  showRecordMessage(`${rawCalculations.length} kayıt Excel dosyasına aktarıldı.`);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  return isNaN(d.getTime()) ? dateStr : new Intl.DateTimeFormat('tr-TR').format(d);
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
