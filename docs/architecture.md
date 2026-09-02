# Mimari ve dosya haritası

```text
.
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── README.md
├── .env                      # SIRLAR — gitignore'da, commit edilmez
├── .env.example              # şablon (APP_PASSWORD, COOKIE_SECRET, COOKIE_SECURE)
├── package.json              # debak-maliyet-hesaplama; start / dev
├── server.js                 # Express: env yükleyici + auth + CRUD kayıt
├── web.config                # IIS iisnode; /public statik; .env & data gizli
├── data/
│   └── calculations.json      # ortak liste (canlı veri)
├── public/
│   ├── index.html            # giriş + form + liste
│   ├── app.js                # state, formül, API, teklif, CSV
│   ├── style.css             # sarı giriş / mercan sonuç; yazdırma
│   └── debak-logo.jpg         # beklenen logo (favicon + antet)
└── .cursor/
    ├── skills/debak-maliyet-hesaplama/SKILL.md
    └── rules/debak-maliyet-hesaplama.mdc
```

Build yok; tarayıcı `app.js`’i doğrudan yükler (`defer`).

## Yığın

- Node.js, Express 4, `cookie-parser` (imzalı cookie)
- Frontend: HTML + CSS + vanilya JS (framework yok)
- Kalıcılık: `data/calculations.json` (UTF-8, pretty-print dizi)
- Yerel taslak: `localStorage['maliyet-formu']`
- Yapılandırma: `.env` (ek paket yok — `loadEnvFile()` `server.js` içinde)

## Yapılandırma ve sırlar

`server.js` açılışta `.env` dosyasını okur. Zaten tanımlı ortam değişkenlerini **ezmez**, yani IIS/sistem seviyesinde tanımlama da çalışır.

| Değişken | Zorunlu | Ne |
|---|:---:|---|
| `APP_PASSWORD` | ✓ | Ekip giriş şifresi |
| `COOKIE_SECRET` | ✓ | Cookie imzalama sırrı (≥32 karakter önerilir) |
| `COOKIE_SECURE` | — | `true` ise cookie yalnız HTTPS’te gönderilir. İç ağ HTTP’de `false`. |
| `PORT` | — | IIS/iisnode verir; yoksa 3000 |

Zorunlu ikisinden biri eksikse **sunucu `exit(1)` ile kapanır** — kodda yedek değer yoktur.

## Güvenlik katmanları

| Katman | Nerede |
|---|---|
| `requireAuth` — tüm `/api/calculations` uçları | `server.js` |
| İmzalı cookie (`signed`, `httpOnly`, `sameSite=strict`) | `COOKIE_OPTIONS` |
| Sabit süreli şifre karşılaştırması | `passwordMatches()` (`crypto.timingSafeEqual`) |
| Giriş deneme limiti — IP başına 15 dk / 10 hata → 429 | `loginAttempts` Map |
| `quoteStatus` beyaz listesi | `ALLOWED_QUOTE_STATUS` |
| Bilinmeyen `/api/*` → JSON 404 | `app.all('/api/*')` |
| Yığın izi sızdırmayan hata yakalayıcı | son `app.use((err, …))` |
| `.env` / kaynak dosya erişim engeli | `web.config` → `BlockSensitiveFiles` + `hiddenSegments` |
| WebDAV kapalı (DELETE 405 vermesin) | `web.config` → `<remove name="WebDAVModule" />` |

İstemci tarafında `handleUnauthorized()` 401 alan her çağrıda giriş ekranına döner.

## Kayıt nesnesi

`POST /api/calculations` üretir:

| Alan | Kaynak |
|------|--------|
| `id` | `calc-{Date.now()}-{crypto.randomBytes(4)}` |
| `customerName`, `partName`, `articleNo`, `material` | gövde |
| `projectName` | `formData.projectName` |
| `savedBy` | **yalnız** imzalı cookie `user_name` (gövdedeki `savedBy` yok sayılır) |
| `calculationDate` | `calculationDate` veya bugün (ISO `YYYY-MM-DD`) |
| `quantity`, `netCost`, `exWorkPrice`, `salePrice`, `expectedRevenue`, `materialAmount` | sayı |
| `quoteStatus` | `''` (sonra PATCH) |
| `formData` | tam form state (`extras` dahil) |
| `createdAt` | ISO datetime |

PATCH yalnız `quoteStatus` yazar ve değeri `ALLOWED_QUOTE_STATUS` beyaz listesine karşı doğrular. `DELETE /api/calculations/:id` kaydı `data/calculations.json`'dan kalıcı olarak siler (`requireAuth`; istemcide `confirm()` onayı).

## İstemci state

`state` = metin alanları + sayılar + `extras: [{ id, name, price }]`.
Yüzde alanları (`wasteRate`, `profitRate`) kesir. Ek kalem `id` yeni satırda `ek-{timestamp}`.

## Akış

1. `GET /api/auth/check` → giriş veya uygulama
2. Form `input` → `state` → `recalculate()` → DOM
3. **Kaydet** → localStorage (sunucuya gitmez)
4. **Ortak listeye ekle** → POST; yanıt `unshift` ile tabloya
5. **Formu aç** → `formData` + üst alanlar `state`’e, sayfa başına kaydır
6. **Teklif oluştur** → yeni pencerede İngilizce mektup (aynı müşteri+proje)
7. **Excel’e aktar** → istemci CSV indirme (sunucu yok)
8. **Sil** → onay sonrası DELETE; satır `rawCalculations`'tan düşer ve tablo yenilenir

## IIS

`web.config` kural sırası:

1. **`BlockSensitiveFiles`** — `.env*`, `web.config`, `package*.json`, `server.js`, `*.md` → 404. Bu kural en başta olmalı: `DynamicContent` yalnız "dosya YOKSA" eşleştiği için, kökte gerçekten var olan `.env` Node’a gitmez ve IIS’in statik işleyicisine düşebilirdi.
2. `StaticContent` — `public/` dosyaları statik.
3. `DynamicContent` — kalan her şey `server.js`.

Gizli segmentler: `node_modules`, `iisnode`, `data`, `.env`, `.env.example`, `.git`, `.cursor`, `docs`, `skills`. `.env` uzantısı `fileExtensions` ile de yasaklı.

`devErrorsEnabled=false` (yığın izi tarayıcıya gitmez), `node_env=production`. Güvenlik başlıkları: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`; `X-Powered-By` kaldırılır.

**Dağıtımda:** `.env` dosyasını IIS kopyasına elle koymayı unutmayın; yoksa uygulama açılmaz (iisnode logunda `HATA: Zorunlu ortam değişkenleri…` görünür).

PORT ortam değişkeni (IIS/iisnode verir) veya 3000.

## Bilinen boşluklar

- `public/debak-logo.jpg` repoda yoksa giriş/antet boş görünür; IIS kopyasında duruyor olabilir
- Teklif başlığında «BAGALİT» yazımı var (`createQuoteDocument`); şirket adı Bakalit
- `cookie-parser` signed secret kullanır ama cookie `signed: true` değil
- `GET /api/calculations` kimlik doğrulamasız
