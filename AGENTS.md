# DEBAK Maliyet Hesaplama — ajan kılavuzu

Bu dosyayı oku. Ayrıntı: [docs/formulas.md](docs/formulas.md), [docs/architecture.md](docs/architecture.md), [README.md](README.md).

Cursor skill: [.cursor/skills/debak-maliyet-hesaplama/SKILL.md](.cursor/skills/debak-maliyet-hesaplama/SKILL.md).

## Ne bu

Debak Denizli Bakalit Kalıp Sanayi ve Ticaret A.Ş. için **maliyet hesaplama ve teklif yönetimi**. Tek sayfa SPA: giriş kapısı + form + birim maliyet paneli + ortak kayıt listesi. Formüller orijinal Excel şablonundan; sunucu hesaplamaz, yalnız kayıt tutar.

Yığın: Node.js + Express (`server.js`) + vanilya JS (`public/app.js`). Veritabanı yok; kayıtlar `data/calculations.json`. IIS’te iisnode (`web.config`).

## Sert kurallar

- Formülleri kullanıcı onaylamadan **değiştirme**. Esas: [docs/formulas.md](docs/formulas.md). `recalculate()` tek kaynak.
- `wasteRate` ve `profitRate` state’te **kesir** (0.05 = %5). Arayüz yüzde gösterir, kaydederken `/100`.
- Ortak şifre ve cookie sırrı `server.js` içinde sabit. **Sohbette tekrar etme**; yeni dosyaya kopyalama. Mümkünse `.env`’e taşı, `.env` commit etme.
- `data/calculations.json` canlı kayıttır. Kullanıcı istemeden silme / boşaltma.
- Yayın veya IIS kopyası yalnız kullanıcı açıkça istediğinde.

## Ekranlar

Tek rota (`/` → `public/index.html`). İki görünüm:

| Görünüm | DOM | İşlev |
|---------|-----|--------|
| Giriş | `#login-gate` | Ad + ortak şifre |
| Uygulama | `#app-root` | Form (01–05), özet kartlar, hesap dökümü, ortak liste |

Form bölümleri: 01 Parça bilgileri · 02 Kalıp ve üretim · 03 Ek parça/operasyonlar · 04 Ambalaj ve nakliye · 05 Kâr oranı.

Sarı alan = giriş, mercan alan = otomatik hesap.

## API

Kimlik: cookie `user_name` (httpOnly, 30 gün). `GET /api/calculations` şu an kimlik kontrolü yapmaz.

| Method | Yol | İş |
|--------|-----|-----|
| POST | `/api/auth/login` | `{ name, password }` → cookie |
| POST | `/api/auth/logout` | cookie sil |
| GET | `/api/auth/check` | `{ authenticated, name }` |
| GET | `/api/calculations` | `{ calculations }` |
| POST | `/api/calculations` | yeni kayıt; `partName` zorunlu; `formData` = tam form state |
| PATCH | `/api/calculations` | yalnız `{ id, quoteStatus }` |

Silme / tam güncelleme endpoint’i yok. Yeni kayıt `unshift` ile listenin başına eklenir.

## İş kuralları

- Net maliyet (`baseCost`) = hammadde + kalıp + makine/işçilik + kalkülatif faiz
- EX-WORK = (net maliyet + ek kalemler) × (1 + kâr oranı)
- Satış fiyatı = EX-WORK + ambalaj/ad + nakliye/ad
- Kalkülatif faiz: kapitalin **%10**’u (`0.10 * adet * brüt × (1+fire) × fiyat / 1000`), birime bölünür
- `safeDiv(a,b)`: payda 0 ise 0
- Teklif durumu: `""` · `Değerlendirmede` · `Onaylandı` · `Reddedildi`
- Liste gruplama: müşteri + proje (Türkçe locale)
- Yerel taslak: `localStorage` anahtarı `maliyet-formu`
- Excel: UTF-8 BOM + `;` CSV, `tr-TR` sayı
- Teklif PDF: aynı müşteri+proje kayıtları; 3’ten fazla parçada Letter landscape; İngilizce mektup

## Değişiklik yaparken

- Formül / sonuç DOM: `public/app.js` → `recalculate()` + `docs/formulas.md`
- Form alanları: `public/index.html` (`id="inp-…"` / `id="res-…"`) ve `populateFormFields` listesi birlikte
- API / JSON kayıt: `server.js` + `data/calculations.json` şeması (`docs/architecture.md`)
- Stil / yazdırma: `public/style.css`
- IIS: `web.config` (iisnode; `data`, `node_modules`, `iisnode` gizli)

## Çalıştırma

```text
npm install
npm start          → http://localhost:3000
npm run dev        → node --watch server.js
```

PORT: `process.env.PORT || 3000`.

## Doğrulama

Tarayıcıda: giriş → sarı alan doldur → sağ panel/özet anında güncellenir → Kaydet (yerel) · Ortak listeye ekle → Formu aç · Teklif oluştur · Excel’e aktar · Yazdır. Liste yenilemeden sonra kayıt duruyor mu bak.
