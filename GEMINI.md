# Gemini / herhangi bir ajan

Önce [AGENTS.md](AGENTS.md) oku. Formüller: [docs/formulas.md](docs/formulas.md). Mimari: [docs/architecture.md](docs/architecture.md).

Formülleri kullanıcı onaylamadan değiştirme. Sırlar `.env` içindedir (`APP_PASSWORD`, `COOKIE_SECRET`) — sohbette tekrar etme, koda gömme. Yeni `/api` rotası eklerken `requireAuth` middleware'ini geç. `data/calculations.json` canlı kayıttır.
