# План исправления и добавления светлой темы в дашборд meloddyCMS

Исправление бага в скрипте инициализации темы и добавление кнопки переключения темы в левый сайдбар для соответствия белому стилю лендинга.

## Шаги реализации

1. **Исправление [theme.js](file:///c:/Users/9/Desktop/meloddyCMS/public/js/theme.js)**:
   - По умолчанию возвращать тему `light` (если не задано иное в localStorage).
   - В функции `setTheme` при значении `light` добавлять атрибут `data-theme="light"` к элементу `html`.
   - При значении `dark` удалять этот атрибут (так как темная тема прописана в `:root` по умолчанию).

2. **Добавление кнопки переключателя в сайдбары**:
   - Внедрить пункт меню с `id="themeToggleBtn"` перед кнопкой выхода (`logoutBtn`) в сайдбар следующих HTML-файлов:
     - [dashboard.html](file:///c:/Users/9/Desktop/meloddyCMS/public/dashboard.html)
     - [settings.html](file:///c:/Users/9/Desktop/meloddyCMS/public/settings.html)
     - [file-manager.html](file:///c:/Users/9/Desktop/meloddyCMS/public/file-manager.html)
     - [docs.html](file:///c:/Users/9/Desktop/meloddyCMS/public/docs.html)
     - [admin.html](file:///c:/Users/9/Desktop/meloddyCMS/public/admin.html)

3. **Обновление списка файлов для деплоя**:
   - В [deploy.py](file:///c:/Users/9/Desktop/meloddyCMS/deploy.py) добавить файлы `public/js/theme.js`, `public/settings.html`, `public/file-manager.html`, `public/docs.html` и `public/admin.html` в список загружаемых файлов, чтобы они обновились на сервере.

4. **Запуск деплоя**:
   - Выполнить `python deploy.py` локально для отправки всех измененных файлов на удаленный сервер и перезапуска PM2.

## Верификация
- Открыть дашборд. По умолчанию он должен отображаться в светлом стиле (белый фон, серые границы, синие кнопки).
- Проверить работоспособность переключателя темы в сайдбаре: при клике на "Темная тема" дашборд должен плавно переключиться в темный стиль. При повторном клике на "Светлая тема" — вернуться в светлый стиль.
- Убедиться, что настройка темы сохраняется при обновлении страницы (`F5`).
