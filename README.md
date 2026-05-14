# JWS: Berlin Rush

A browser-based endless runner game featuring the cast of JWS (Jung. Wild. Sexy.) Season 8.

## Run locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Do not open `index.html` directly via `file://` — the Supabase edge functions enforce a CORS allow-list and reject `file://` origins, so score submit will fail. Allowed dev ports: `8000`, `3000`.

## Copyright, License & Legal

Copyright © 2026 Yanick Semmler. All rights reserved.

This repository is publicly visible for deployment and review purposes only. It is not open source. No license is granted to copy, modify, redistribute, sublicense, publish, commercially exploit, or otherwise use this code, game, documentation, design, media, or assets without prior written permission.

Game created by Yanick Semmler.

Official oneplus legal information:
- [Nutzungsbedingungen](https://www.oneplus.ch/nutzungsbedingungen)
- [Impressum](https://www.oneplus.ch/impressum)
- [Datenschutz](https://www.oneplus.ch/datenschutz)
