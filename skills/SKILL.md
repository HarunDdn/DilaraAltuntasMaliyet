---
name: debak-maliyet-hesaplama
description: Debak Denizli Bakalit maliyet hesaplama ve teklif yönetim uygulamasını geliştirir veya düzeltir. Kullanıcı maliyet, teklif, EX-WORK, net maliyet, kalıp, hammadde, fire, kâr oranı, ortak hesaplama listesi, calculations.json veya bu Express SPA projesinden bahsettiğinde kullan.
---

# DEBAK Maliyet Hesaplama

**Esas kopya repodadır** (Claude ve diğer ajanlar burayı görmeyebilir):

`D:\Maliyet Hesaplama\AGENTS.md` · `docs\formulas.md` · `docs\architecture.md` · `.cursor\skills\debak-maliyet-hesaplama\SKILL.md`

## Sert kural

Formülleri kullanıcı onaylamadan değiştirme. Esas: [formulas.md](formulas.md). Hesap yalnız `public/app.js` → `recalculate()`. Sırlar `.env` içinde (`APP_PASSWORD`, `COOKIE_SECRET`) — sohbette yazma, koda gömme. `data/calculations.json` silme.

## Ekran

Tek sayfa `/`: giriş → form 01–05 + özet kartlar + ortak liste.

## API

`POST /api/auth/login` (IP başına deneme limitli) · `logout` · `GET /api/auth/check` · `GET|POST|PATCH /api/calculations` — **hepsi `requireAuth` gerektirir**, PATCH yalnız `quoteStatus` (beyaz listeli). Bilinmeyen `/api/*` → JSON 404.

## İş kuralları

- Net maliyet = hammadde + kalıp + makine/işçilik + faiz (%10 kapital / adet)
- EX-WORK = (net + ekler) × (1 + kâr); satış = EX-WORK + ambalaj + nakliye
- `wasteRate` / `profitRate` kesir; `materialAmount` net ağırlık
- Teklif: Değerlendirmede / Onaylandı / Reddedildi
- localStorage: `maliyet-formu`

## Yayın

Kullanıcı istemeden IIS dağıtımı yapma.
