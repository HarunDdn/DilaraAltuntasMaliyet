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

Formüller orijinal şablona bağlıdır; kullanıcı onaylamadan değiştirme. Ortak şifreyi sohbette yazma. `data/calculations.json` canlı kayıttır.

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

## Veri

Kayıtlar `data/calculations.json` dosyasına yazılır. IIS `data` klasörünü tarayıcıdan gizler. Yedek almadan dosyayı silme.

## Teknoloji

Express 4, `cookie-parser`, statik `public/`. React/Next yok. Hesaplama tarayıcıda (`public/app.js`).
