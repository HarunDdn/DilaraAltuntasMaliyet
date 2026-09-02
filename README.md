# DEBAK Maliyet Hesaplama

Debak Denizli Bakalit Kalıp Sanayi ve Ticaret A.Ş. — **maliyet hesaplama ve teklif yönetim** modülü.

Yerel: `http://localhost:3000` · IIS: `web.config` + iisnode (`server.js`)

## Ajanlar buradan başlasın

Bu klasörü açan Claude, Cursor, Gemini veya başka bir ajan **önce bunları okusun**:

| Dosya | Ne için |
|--------|---------|
| [AGENTS.md](AGENTS.md) | Sert kurallar, API, nerede kod değişir |
| [CLAUDE.md](CLAUDE.md) | Claude Code kısayolu → AGENTS.md |
| [GEMINI.md](GEMINI.md) | Gemini kısayolu → AGENTS.md |
| [docs/formulas.md](docs/formulas.md) | Birim maliyet formülleri (`recalculate`) |
| [docs/architecture.md](docs/architecture.md) | Dosya haritası, JSON kayıt, IIS |
| [.cursor/skills/debak-maliyet-hesaplama/SKILL.md](.cursor/skills/debak-maliyet-hesaplama/SKILL.md) | Cursor skill |

Formüller orijinal şablona bağlıdır; kullanıcı onaylamadan değiştirme. Sırlar `.env` içindedir — sohbette yazma, commit etme. `data/calculations.json` canlı kayıttır.

## Ne işe yarar

- Parça / kalıp / işçilik / fire / kâr ile **net maliyet**, **EX-WORK** ve **satış fiyatı** (EUR/ad)
- Ek parça ve operasyon satırları
- Ambalaj ve nakliye birim payı
- Ortak liste: kim kaydetti, teklif durumu, formu tekrar açma
- İngilizce teklif mektubu (yazdır / PDF) ve Excel (CSV) aktarımı

## Ekran

Tek sayfa. Giriş (ad + ekip şifresi) sonrası:

1. Parça bilgileri (hacim, yoğunluk, fire, hammadde fiyatı, adet)
2. Kalıp ve üretim (göz, çevrim, amortisman, makine/işçilik)
3. Ek parça ve operasyonlar
4. Ambalaj ve nakliye
5. Kâr oranı

Sağ panel birim dökümü; üstte özet kartlar. Altta ortak kayıt tablosu (müşteri+proje gruplu).

## Kurulum

Sırlar kodda tutulmaz. İlk kurulumda `.env` dosyası **zorunludur**; yoksa sunucu başlamaz.

```bash
cp .env.example .env
```

`.env` içine iki değeri yazın:

| Değişken | Ne |
|---|---|
| `APP_PASSWORD` | Ekip giriş şifresi |
| `COOKIE_SECRET` | Cookie imzalama sırrı, rastgele ≥32 karakter |
| `COOKIE_SECURE` | HTTPS’te `true`, düz HTTP’de `false` |

Sır üretmek için:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`COOKIE_SECRET` değiştiğinde tüm açık oturumlar geçersiz olur — herkes bir kez yeniden giriş yapar.

## Yerel çalıştırma

```bash
npm install
npm start
```

Geliştirme (dosya izleme):

```bash
npm run dev
```

Tarayıcı: [http://localhost:3000](http://localhost:3000)

## Veri ve erişim

Kayıtlar `data/calculations.json` dosyasına yazılır. Yedek almadan dosyayı silme.

`/api/calculations` uçlarının tamamı (okuma dahil) giriş ister; giriş yapmayan istek `401` alır. Kimlik imzalı cookie’den okunur, istek gövdesinden değil. Giriş ekranı IP başına 15 dakikada 10 hatalı denemeden sonra kilitlenir. IIS tarafında `.env`, `data`, `docs`, `skills`, `node_modules` ve `.git` tarayıcıdan kapalıdır.

## Teknoloji

Express 4, `cookie-parser` (imzalı cookie), statik `public/`. React/Next yok, ek bağımlılık yok — `.env` yükleyici ve deneme limiti `server.js` içinde. Hesaplama tarayıcıda (`public/app.js`).
