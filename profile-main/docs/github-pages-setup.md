# GitHub Pages Setup

Project nÃ y Ä‘Æ°á»£c deploy tÄ©nh tá»« thÆ° má»¥c `profile-main/` qua GitHub Actions.

## 1. Push repo lÃªn GitHub

- Äáº£m báº£o branch chÃ­nh cÃ³ tÃªn `main`.
- Push toÃ n bá»™ repo nÃ y lÃªn GitHub.

## 2. Báº­t GitHub Pages

Trong repo GitHub:

1. VÃ o `Settings > Pages`
2. á»ž `Source`, chá»n `GitHub Actions`

Workflow [`deploy-pages.yml`](../../.github/workflows/deploy-pages.yml) sáº½ tá»± deploy thÆ° má»¥c `profile-main/`.

## 3. MÅŸ URL sau khi deploy

GitHub Pages thÆ°á»ng sáº½ cho URL dáº¡ng:

- `https://<username>.github.io/<repo>/`

VÃ¬ project dÃ¹ng Ä‘Æ°á»ng dáº«n tÆ°Æ¡ng Ä‘á»‘i, khÃ´ng cáº§n Ä‘á»•i `index.html`, `login.html`, `admin.html`.

## 4. Cáº­p nháº­t Supabase

Náº¿u dÃ¹ng login/admin trÃªn host GitHub Pages, hÃ£y vÃ o Supabase:

1. `Authentication > URL Configuration`
2. ThÃªm URL GitHub Pages cá»§a báº¡n vÃ o `Site URL`
3. Náº¿u cÃ³ danh sÃ¡ch `Redirect URLs`, thÃªm cáº£:
   - `https://<username>.github.io/<repo>/login.html`
   - `https://<username>.github.io/<repo>/admin.html`
   - `https://<username>.github.io/<repo>/index.html`

## 5. Kiá»ƒm tra sau khi deploy

- `index.html`: trang public render source tá»« Supabase
- `login.html`: Ä‘Äƒng nháº­p admin
- `admin.html`: upload source

Náº¿u trang lÃªn Ä‘Æ°á»£c nhÆ°ng login/upload lá»—i, nguyÃªn nhÃ¢n thÆ°á»ng nÄ±m á»Ÿ Supabase Auth hoáº·c RLS policy, khÃ´ng pháº£i GitHub Pages.
