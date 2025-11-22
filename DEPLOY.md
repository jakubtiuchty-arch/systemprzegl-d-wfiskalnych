# 🚀 Instrukcja wdrożenia na Vercel

## Krok 1: Przygotowanie repozytorium Git

```bash
# Jeśli nie masz jeszcze repozytorium Git:
git init
git add .
git commit -m "Initial commit - System przeglądów fiskalnych"

# Utwórz repozytorium na GitHub i wypchnij kod:
git remote add origin https://github.com/TWOJ_USERNAME/fiscalinspector-web.git
git branch -M main
git push -u origin main
```

## Krok 2: Deploy na Vercel

1. Wejdź na [vercel.com](https://vercel.com) i zaloguj się (przez GitHub)
2. Kliknij **"Add New Project"**
3. Wybierz swoje repozytorium `fiscalinspector-web`
4. **Framework Preset**: Vite
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`

## Krok 3: Zmienne środowiskowe

W ustawieniach projektu Vercel (**Settings → Environment Variables**) dodaj:

```
RESEND_API_KEY=twój_klucz_resend
VITE_SUPABASE_URL=https://jwonohhnzvwyplnmfqgp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_2XAuUs2e3rtudGtwpoe6BQ_rZniezir
```

⚠️ **WAŻNE**: Klucz `RESEND_API_KEY` musisz dodać (nie mam go w `.env.local`).

## Krok 4: Redeploy

Po dodaniu zmiennych środowiskowych:
1. Wejdź w **Deployments**
2. Kliknij **⋯** przy ostatnim deployu
3. Wybierz **Redeploy**

## Krok 5: Testowanie

Aplikacja będzie dostępna pod adresem:
```
https://fiscalinspector-web.vercel.app
```

### Checklist testów:
- [ ] Logowanie działa (email + hasło)
- [ ] Można dodać przegląd
- [ ] PDF generuje się poprawnie
- [ ] Email wysyła się (sprawdź skrzynkę)
- [ ] Tryb offline - wyłącz WiFi i sprawdź, czy mail trafia do kolejki
- [ ] Po włączeniu WiFi - sprawdź, czy mail wysłał się automatycznie

## Troubleshooting

### Problem: "Failed to fetch fonts"
- Sprawdź, czy folder `public/fonts/` jest w repozytorium
- Upewnij się, że pliki `.ttf` są commitowane

### Problem: "Supabase connection failed"
- Sprawdź zmienne środowiskowe w Vercel
- Upewnij się, że tabela `inspections` istnieje w Supabase

### Problem: "Email not sending"
- Sprawdź `RESEND_API_KEY` w Vercel
- Sprawdź logi w Vercel Functions

## Dodatkowe konfiguracje

### Custom Domain (opcjonalnie)
1. Vercel → Settings → Domains
2. Dodaj swoją domenę (np. `przeglądy.takma.pl`)
3. Skonfiguruj DNS zgodnie z instrukcjami Vercel
