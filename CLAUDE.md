# Claude / herhangi bir ajan

Önce [AGENTS.md](AGENTS.md) oku. Formüller: [docs/formulas.md](docs/formulas.md). Dosya haritası: [docs/architecture.md](docs/architecture.md). İnsan özeti: [README.md](README.md).

Cursor bu repoda skill’i şuradan yükler: `.cursor/skills/debak-maliyet-hesaplama/SKILL.md`.

Kısa kurallar: formülleri kullanıcı onaylamadan değiştirme; `recalculate()` tek kaynak; `wasteRate`/`profitRate` kesir; sırlar `.env` içinde (`APP_PASSWORD`, `COOKIE_SECRET`) — sohbette yazma, koda gömme; yeni `/api` rotasına `requireAuth` ekle; `data/calculations.json` canlı kayıttır.
