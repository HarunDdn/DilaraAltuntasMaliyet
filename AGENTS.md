# DEBAK Maliyet Hesaplama — ajan kılavuzu

Bu dosyayı oku. Ayrıntı: [docs/formulas.md](docs/formulas.md), [docs/architecture.md](docs/architecture.md), [README.md](README.md).

Cursor skill: [.cursor/skills/debak-maliyet-hesaplama/SKILL.md](.cursor/skills/debak-maliyet-hesaplama/SKILL.md).

## Ne bu

Debak Denizli Bakalit Kalıp Sanayi ve Ticaret A.Ş. için **maliyet hesaplama ve teklif yönetimi**. Tek sayfa SPA: giriş kapısı + form + birim maliyet paneli + ortak kayıt listesi. Formüller orijinal Excel şablonundan; sunucu hesaplamaz, yalnız kayıt tutar.

Yığın: Node.js + Express (`server.js`) + vanilya JS (`public/app.js`). Veritabanı yok; kayıtlar `data/calculations.json`. IIS’te iisnode (`web.config`).

## Sert kurallar

- Formülleri kullanıcı onaylamadan **değiştirme**. Esas: [docs/formulas.md](docs/formulas.md). `recalculate()` tek kaynak.
- `wasteRate`, `profitRate` ve `discountRate` state’te **kesir** (0.05 = %5). Arayüz yüzde gösterir, kaydederken `/100`.
- Ortak şifre ve cookie sırrı **`.env` dosyasındadır** (`APP_PASSWORD`, `COOKIE_SECRET`); kodda yedek değer **yok**, tanımsızsa sunucu başlamaz. Sırları **sohbette yazma**, koda gömme, `.env`’i commit etme. Şablon: [.env.example](.env.example).
- `data/calculations.json` canlı kayıttır. Kullanıcı istemeden silme / boşaltma.
- Yayın veya IIS kopyası yalnız kullanıcı açıkça istediğinde.
- Yeni `/api/*` rotası eklerken **`requireAuth`’u geç**. Kullanıcı kimliği yalnız imzalı cookie’den okunur (`req.userName`); gövdedeki `savedBy` gibi alanlara güvenme.

## Ekranlar

Tek rota (`/` → `public/index.html`). İki görünüm:

| Görünüm | DOM | İşlev |
|---------|-----|--------|
| Giriş | `#login-gate` | Ad + ortak şifre |
| Uygulama | `#app-root` | Form (01–06), özet kartlar, hesap dökümü, ortak liste |

Form bölümleri: 01 Parça bilgileri · 02 Kalıp ve üretim · 03 Ek parça/operasyonlar · 04 Ambalaj ve nakliye · 05 Kâr oranı · 06 Açıklamalar (`notes`, serbest metin, karakter sınırı yok; `formData` içinde saklanır; teklifte tablonun altında, Excel’de son sütunda) ve altında **Dosya ekle**: dosya seçilince hemen `/api/files`’a yüklenir, formda `attachments: [{ id, name, size }]` tutulur; dosyalar `data/uploads/<id>` (+ `<id>.json` üst veri), git’e girmez.

Sarı alan = giriş, mercan alan = otomatik hesap.

## API

Kimlik: **imzalı** cookie `user_name` (`httpOnly`, `sameSite=strict`, 30 gün, `secure` = `COOKIE_SECURE`). İmza `COOKIE_SECRET` ile doğrulanır; kurcalanmış veya imzasız cookie geçersizdir.

| Method | Yol | Auth | İş |
|--------|-----|:----:|-----|
| POST | `/api/auth/login` | — | `{ name, password }` → cookie. IP başına 15 dk’da 10 hatalı denemeden sonra 429. |
| POST | `/api/auth/logout` | — | cookie sil |
| GET | `/api/auth/check` | — | `{ authenticated, name }` |
| GET | `/api/calculations` | **✓** | `{ calculations }` |
| POST | `/api/calculations` | **✓** | yeni kayıt; `partName` zorunlu; `formData` = tam form state; `savedBy` cookie’den |
| PUT | `/api/calculations` | **✓** | tam güncelleme (`id` + POST alanları); `id`, `savedBy`, `quoteStatus`, `createdAt` korunur; `updatedBy` cookie’den, `updatedAt` eklenir |
| PATCH | `/api/calculations` | **✓** | yalnız `{ id, quoteStatus }`; durum beyaz listeye karşı doğrulanır |
| DELETE | `/api/calculations` | **✓** | `{ id }` → kaydı kalıcı siler; başka kayıtta kullanılmayan ekleri de siler |
| POST | `/api/files` | **✓** | ham dosya gövdesi, ad `X-File-Name` (encodeURIComponent); en çok 25 MB → `{ file: { id, name, type, size } }` |
| GET | `/api/files/:id` | **✓** | eki indirir (her zaman `attachment` + `application/octet-stream`) |
| * | diğer `/api/*` | — | 404 JSON (HTML değil) |

Auth’suz istek → `401 { error }`. İstemci 401’de `handleUnauthorized()` ile giriş ekranına döner.

Yeni kayıt `unshift` ile listenin başına eklenir. Listede her satırda **Değiştir** (kaydı forma alır, üst buton “Kaydı güncelle” olur → PUT) ve **Sil** (onay sonrası DELETE) vardır; “Formu aç” ise kopya açar (eklenirse yeni kayıt).

## İş kuralları

- Net maliyet (`baseCost`) = hammadde + kalıp + makine/işçilik + kalkülatif faiz
- EX-WORK = (net maliyet + ek kalemler) × (1 + kâr oranı)
- Satış fiyatı = (EX-WORK + ambalaj/ad + nakliye/ad) × (1 − indirim oranı)
- Kalkülatif faiz: kapitalin **%10**’u (`0.10 * adet * brüt × (1+fire) × fiyat / 1000`), birime bölünür
- `safeDiv(a,b)`: payda 0 ise 0
- Teklif durumu: `""` · `Değerlendirmede` · `Onaylandı` · `Reddedildi`
- Liste gruplama: müşteri + proje (Türkçe locale)
- Yerel taslak: `localStorage` anahtarı `maliyet-formu`
- Excel: UTF-8 BOM + `;` CSV, `tr-TR` sayı
- Teklif PDF: aynı müşteri+proje kayıtları; 3’ten fazla parçada Letter landscape; “Teklif oluştur” önce dil sorar (Türkçe / English / Deutsch, metinler `QUOTE_TEXTS`)

## Değişiklik yaparken

- Formül / sonuç DOM: `public/app.js` → `recalculate()` + `docs/formulas.md`
- Form alanları: `public/index.html` (`id="inp-…"` / `id="res-…"`) ve `populateFormFields` listesi birlikte
- API / JSON kayıt: `server.js` + `data/calculations.json` şeması (`docs/architecture.md`)
- Stil / yazdırma: `public/style.css`
- IIS: `web.config` (iisnode; `BlockSensitiveFiles` kuralı + `hiddenSegments`: `.env`, `data`, `docs`, `skills`, `node_modules`, `iisnode`, `.git`, `.cursor`)

## Çalıştırma

```text
cp .env.example .env      # APP_PASSWORD ve COOKIE_SECRET doldur
npm install
npm start          → http://localhost:3000
npm run dev        → node --watch server.js
```

PORT: `process.env.PORT || 3000`. `.env` yoksa sunucu hata verip kapanır.

## Doğrulama

Tarayıcıda: giriş → sarı alan doldur → sağ panel/özet anında güncellenir → Kaydet (yerel) · Ortak listeye ekle → Formu aç · Teklif oluştur · Excel’e aktar · Yazdır. Liste yenilemeden sonra kayıt duruyor mu bak.
