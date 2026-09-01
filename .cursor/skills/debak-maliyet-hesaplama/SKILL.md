---
name: debak-maliyet-hesaplama
description: Debak Denizli Bakalit maliyet hesaplama ve teklif yönetim uygulamasını geliştirir veya düzeltir. Kullanıcı maliyet, teklif, EX-WORK, net maliyet, kalıp, hammadde, fire, kâr oranı, ortak hesaplama listesi, calculations.json veya bu Express SPA projesinden bahsettiğinde kullan.
---

# DEBAK Maliyet Hesaplama

Repo kökü: `AGENTS.md` → `docs/formulas.md`, `docs/architecture.md`, `README.md`.

## Sert kural

Formülleri kullanıcı onaylamadan değiştirme. Esas: [formulas.md](../../../docs/formulas.md). Hesap yalnız `public/app.js` → `recalculate()`.

`wasteRate` / `profitRate` state’te kesir. Şifreyi sohbette yazma. `data/calculations.json` silme.

## Ekran

Tek sayfa `/`: `#login-gate` → `#app-root` (form 01–05 + özet + liste).

## API

`POST /api/auth/login` · `logout` · `GET /api/auth/check` · `GET|POST|PATCH /api/calculations`

PATCH yalnız `quoteStatus`. Silme yok.

## İş kuralları

- Net maliyet = hammadde + kalıp + makine/işçilik + faiz (%10 kapital / adet)
- EX-WORK = (net + ekler) × (1 + kâr)
- Satış = EX-WORK + ambalaj/ad + nakliye/ad
- `materialAmount` net ağırlık; `rawMaterial` brüt ağırlık
- Teklif durumu: Değerlendirmede / Onaylandı / Reddedildi
- localStorage: `maliyet-formu`

## Yayın

Kullanıcı istemeden IIS kopyası / dağıtım yapma. `web.config` iisnode.

## Değişiklik

Formül → `recalculate()` + `docs/formulas.md`. Form `id` → `index.html` + `populateFormFields`. API → `server.js`.
