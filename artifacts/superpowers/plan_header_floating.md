# План: Парящее овальное меню навигации (Boltshift-стиль)

Этот план описывает изменения для превращения верхней панели навигации (`.topbar`) из прижатого к верху прямоугольника в парящую овальную плашку (pill-shape) с полупрозрачным фоном, размытием сзади и тенью.

## Изменения

1. **Модификация стилей в [style.css](file:///c:/Users/9/Desktop/meloddyCMS/public/css/style.css):**
   - Изменить класс `.topbar`:
     - Сделать `position: sticky; top: 16px;`.
     - Задать отступы `margin: 16px 24px 0 24px; width: auto;`.
     - Скруглить углы: `border-radius: var(--radius-pill);` (или `9999px`).
     - Заменить нижнюю границу `border-bottom` на полную границу `border: 1px solid var(--border)`.
     - Добавить тень `box-shadow: var(--shadow-md)`.
     - Добавить полупрозрачный фон с размытием заднего плана:
       - Светлая тема: `background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);`
       - Темная тема: `background: rgba(22, 24, 32, 0.85);`
   - Изменить класс `.main-content`:
     - Убрать `overflow-y: auto;` и `overflow-x: hidden;`, чтобы скроллинг происходил на уровне `body`. Это позволит контенту плавно проезжать за парящим меню, создавая качественный 3D-эффект глубины.
     - Добавить верхний отступ `padding-top: 16px;`, чтобы компенсировать отступы topbar.
   - Изменить `.app-layout`:
     - Убедиться, что он ведет себя корректно при скролле всей страницы.

2. **Обновление версий стилей в HTML-файлах (v=6 -> v=7):**
   - [admin.html](file:///c:/Users/9/Desktop/meloddyCMS/public/admin.html)
   - [dashboard.html](file:///c:/Users/9/Desktop/meloddyCMS/public/dashboard.html)
   - [docs.html](file:///c:/Users/9/Desktop/meloddyCMS/public/docs.html)
   - [file-manager.html](file:///c:/Users/9/Desktop/meloddyCMS/public/file-manager.html)
   - [settings.html](file:///c:/Users/9/Desktop/meloddyCMS/public/settings.html)

3. **Деплой изменений:**
   - Выполнить `python deploy.py` для деплоя на сервер и перезапуска PM2.

## Верификация

1. **Локальный билд и проверка:**
   - Так как это чистый HTML/CSS, проверить правильность синтаксиса стилей.
2. **Проверка после деплоя:**
   - Открыть CMS на сервере, проверить визуальное отображение меню во всех разделах.
   - Проверить скроллинг (контент должен уходить под меню, размываясь за ним).
   - Проверить переключение тем (светлая/темная) для парящего меню.
