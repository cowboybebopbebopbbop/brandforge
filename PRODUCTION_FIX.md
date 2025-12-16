# 🚨 PRODUCTION GENERATION FIX

## Проблема
Generation не работает на production (GitHub Pages).

## Причина
Environment variables (Firebase config, API keys) не передаются в production build.

---

## ✅ РЕШЕНИЕ: Добавить Secrets в GitHub

### Шаг 1: Открыть настройки репозитория
1. Перейти на: https://github.com/cowboybebopbebopbbop/brandforge/settings/secrets/actions
2. Нажать **"New repository secret"**

### Шаг 2: Добавить каждый secret

Добавить следующие secrets (взять значения из `.env` файла):

| Secret Name | Value (из .env) |
|-------------|----------------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyDxmdN0yC4KCHG6BEtsdRvdDI8jeL6hCbU` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `gen-lang-client-0561650904.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `gen-lang-client-0561650904` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `gen-lang-client-0561650904.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `112444417228` |
| `VITE_FIREBASE_APP_ID` | `1:112444417228:web:e5a56d8aece28c151cce69` |
| `VITE_ACCESS_PASSWORD` | `brandforge2024` |

### Шаг 3: Для каждого secret:
1. Нажать "New repository secret"
2. Name: `VITE_FIREBASE_API_KEY` (скопировать точно)
3. Secret: вставить значение из таблицы выше
4. Нажать "Add secret"
5. Повторить для всех 7 secrets

---

## Шаг 4: Перезапустить деплой

После добавления всех secrets:

```bash
# Создать пустой коммит чтобы запустить GitHub Actions
git commit --allow-empty -m "chore: trigger redeploy with secrets"
git push origin main
```

Или перейти на:
https://github.com/cowboybebopbebopbbop/brandforge/actions

И нажать "Re-run all jobs" на последнем workflow.

---

## Проверка

1. Дождаться завершения workflow (2-3 минуты)
2. Открыть: https://cowboybebopbebopbbop.github.io/brandforge/
3. Открыть Developer Console (F12)
4. Перейти в Settings → добавить API key
5. Создать проект → Configure brief → Generate names
6. Проверить что generation работает

---

## Если всё ещё не работает

### Проверить в Console:
1. F12 → Console tab
2. Искать ошибки типа:
   - "Firebase: Error (auth/invalid-api-key)"
   - "Cannot read property 'apiKey' of undefined"
   - Network errors

### Проверить что secrets загружены:
1. F12 → Console
2. Ввести: `console.log(import.meta.env)`
3. Должны быть видны все VITE_* переменные

Если переменные = `undefined`, значит secrets не добавлены или workflow не прошёл.

---

## Быстрый тест (локально)

Проверить что build работает с env variables:

```bash
cd brandforge
npm run build
npx serve dist -p 3000
```

Открыть http://localhost:3000/brandforge/ и проверить.

---

## Альтернатива: Firebase Hosting (уже работает!)

Если GitHub Pages продолжает не работать, используйте Firebase:

**Working URL:** https://gen-lang-client-0561650904.web.app

Firebase уже задеплоен и работает правильно! 🎉
