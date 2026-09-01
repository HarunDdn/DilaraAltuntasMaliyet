# Mimari ve dosya haritası

```text
.
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── README.md
├── package.json              # debak-maliyet-hesaplama; start / dev
├── server.js                 # Express: statik + auth + CRUD kayıt
├── web.config                # IIS iisnode; /public statik; data gizli
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

- Node.js, Express 4, `cookie-parser`
- Frontend: HTML + CSS + vanilya JS (framework yok)
- Kalıcılık: `data/calculations.json` (UTF-8, pretty-print dizi)
- Yerel taslak: `localStorage['maliyet-formu']`

## Kayıt nesnesi

`POST /api/calculations` üretir:

| Alan | Kaynak |
|------|--------|
| `id` | `calc-{Date.now()}-{random}` |
| `customerName`, `partName`, `articleNo`, `material` | gövde |
| `projectName` | `formData.projectName` |
| `savedBy` | cookie `user_name` veya `savedBy` veya `'Harun'` |
| `calculationDate` | `calculationDate` veya bugün (ISO `YYYY-MM-DD`) |
| `quantity`, `netCost`, `exWorkPrice`, `salePrice`, `expectedRevenue`, `materialAmount` | sayı |
| `quoteStatus` | `''` (sonra PATCH) |
| `formData` | tam form state (`extras` dahil) |
| `createdAt` | ISO datetime |

PATCH yalnız `quoteStatus` yazar. Kayıt silme yok.

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

## IIS

`web.config`: tüm dinamik istekler `server.js`; `public/` dosyaları statik. Gizli segmentler: `node_modules`, `iisnode`, `data`. `node_env=production`.

PORT ortam değişkeni (IIS/iisnode verir) veya 3000.

## Bilinen boşluklar

- `public/debak-logo.jpg` repoda yoksa giriş/antet boş görünür; IIS kopyasında duruyor olabilir
- Teklif başlığında «BAGALİT» yazımı var (`createQuoteDocument`); şirket adı Bakalit
- `cookie-parser` signed secret kullanır ama cookie `signed: true` değil
- `GET /api/calculations` kimlik doğrulamasız
