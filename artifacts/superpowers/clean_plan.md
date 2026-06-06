# Брейншторминг и план очистки проекта от временных файлов (Обновленный)

## 1. Брейншторминг

* **Цель**: Полностью очистить рабочую директорию проекта `meloddyCMS` от временных файлов, скриптов тестирования, бэкапов и документации планов, созданных ИИ-агентом.
* **Исключения (что нужно оставить для деплоя)**:
  * Скрипт `deploy.py`
  * Скрипт `deploy_changes.ps1`
  * Бинарные утилиты `plink.exe` и `pscp.exe`, которые используются в `deploy_changes.ps1` для деплоя.
* **Ограничения**:
  * Не удалять важные файлы проекта: `server.js`, директорию `data/`, директорию `public/`, директорию `src/`, директорию `site/`, файл `package.json`, `package-lock.json`, `.env`, `.gitignore`, `node_modules/`.
  * Не удалять служебные папки ИИ-помощника: `.agent/`, `artifacts/`, `scratch/`.
* **Риски**:
  * Случайное удаление важного файла (например, `server.js` или содержимого `data/`).
  * Удаление базы данных `data/users.json` (в корне также лежит `users.json`, который является дублем/старым файлом, его удалить можно, а `data/users.json` нужно сохранить).
* **Критерии приемки**:
  * Все `*.py` файлы (кроме `deploy.py`) удалены из корня проекта.
  * Все `*.js` файлы (кроме `server.js`) удалены из корня проекта.
  * Все `*.ps1` файлы (кроме `deploy_changes.ps1`) удалены из корня проекта.
  * Временные markdown-планы и рекомендации (`AI_PREPARATION_PROMPT.md`, `UI_KIT.md`, `plan_bg_favicon.md`, `plan_landing_form.md`, `plan_ux.md`, `ux_recommendations.md`) удалены из корня.
  * Временные папки `deploy_temp`, `public_recovered`, `public_true_baseline`, `replay_public`, `temp_zip` удалены.
  * Временные архивы и бэкапы (`meloddyCMS.zip`, `settings.html.bak`, `settings_checked.html`, `users.json` в корне) удалены.
  * Файлы `deploy.py`, `deploy_changes.ps1`, `plink.exe` и `pscp.exe` успешно сохранены в корне.
  * Проект успешно запускается через `npm start` после очистки.

---

## 2. Пошаговый план реализации

### Шаг 1. Удаление временных папок в корне
Удалить следующие папки (используя PowerShell в Windows):
* `deploy_temp`
* `public_recovered`
* `public_true_baseline`
* `replay_public`
* `temp_zip`

### Шаг 2. Удаление скриптов Python (`*.py`) в корне, кроме `deploy.py`
Удалить все `*.py` файлы в корне проекта, за исключением `deploy.py`.

### Шаг 3. Удаление временных JS-скриптов и тестов в корне
Удалить все `*.js` файлы в корне, **ЗА ИСКЛЮЧЕНИЕМ** `server.js`.

### Шаг 4. Удаление PowerShell скриптов (`*.ps1`) в корне, кроме `deploy_changes.ps1`
Удалить все `*.ps1` файлы в корне, за исключением `deploy_changes.ps1`.

### Шаг 5. Удаление архивов в корне
Удалить:
* `meloddyCMS.zip`

### Шаг 6. Удаление временных документов, бэкапов и прочих файлов
Удалить:
* `settings.html.bak`
* `settings_checked.html`
* `users.json` (только тот, который в корне! `data/users.json` оставить без изменений)
* `AI_PREPARATION_PROMPT.md`
* `UI_KIT.md`
* `plan_bg_favicon.md`
* `plan_landing_form.md`
* `plan_ux.md`
* `ux_recommendations.md`

---

## 3. Верификация

После удаления файлов запустить:
1. Проверить синтаксис главного файла: `node -c server.js`.
2. Запуск проекта с помощью `npm start` (проверка, что ничего не ломает проект).
3. Проверить список оставшихся файлов в корне, чтобы убедиться, что `deploy.py`, `deploy_changes.ps1`, `plink.exe` и `pscp.exe` на месте.
