# План реализации: Исправление отступов, стилизация шаблонов и деплой на сервер

## 1. Цель
1. **Отступы широких экранов:** В `public/css/style.css` заменить медиа-запрос `@media (min-width: 1920px)` на `@media (min-width: 1440px)` с ограничением максимальной ширины в `1400px`, убрав центрирование (`margin-left: auto; margin-right: auto;`), чтобы контент прижимался к левой стороне (к сайдбару).
2. **Стилизация карточек шаблонов (Templates):** Изменить рендеринг карточек шаблонов в `dashboard.js` и `dashboard_v2.js` (функция `loadTemplates()`). Вместо плитки `glass-panel` сделать их горизонтальными строками в стиле `hero-card` с кнопками управления справа в ряд (с поддержкой переноса кнопок на мобильных устройствах).
3. **Проверка Leads (Заявок с сайтов):** Проверить стилизацию заявок с сайтов клиентов во вкладке "Заявки" (leads) в меню управления сайтом, убедиться в их корректном отображении.
4. **Заявки на привязку (Requests):** Реализовать функцию `loadRequests()` для полноценной работы вкладки "Заявки на привязку" разработчика в дашборде.
5. **Деплой:** Загрузить обновленные файлы (`style.css`, `dashboard.js`, `dashboard_v2.js` и другие измененные) на сервер `195.209.214.15` и перезапустить процесс PM2.

## 2. Предлагаемые изменения

### CSS (Стилизация)

#### [MODIFY] [public/css/style.css](file:///c:/Users/9/Desktop/meloddyCMS/public/css/style.css)
- Заменить медиа-запрос `@media (min-width: 1920px)` в конце файла на `@media (min-width: 1440px)`:
  ```css
  @media (min-width: 1440px) {
      .dashboard-container,
      .fm-container,
      .profile-dashboard-grid,
      .pricing-cards-container,
      .glass-panel,
      .docs-content-area,
      #panelAnalytics {
          max-width: 1400px;
      }
      .stats-grid {
          grid-template-columns: repeat(5, 1fr) !important;
      }
      #sitesContainer {
          grid-template-columns: 1fr !important; /* Упорядочивание в flex column */
      }
  }
  ```
- Убрать `margin: 0 auto;` из базового класса `.dashboard-container` на строке 370 (сделать `margin: 0;`), чтобы контент не центрировался на средних экранах.

### JS (Дашборд и логика карточек)

#### [MODIFY] [public/js/dashboard_v2.js](file:///c:/Users/9/Desktop/meloddyCMS/public/js/dashboard_v2.js) и [public/js/dashboard.js](file:///c:/Users/9/Desktop/meloddyCMS/public/js/dashboard.js)
- В функции `loadTemplates()` изменить разметку карточки шаблона на горизонтальную:
  - Использовать класс `hero-card` вместо `glass-panel`.
  - Задать `display: flex; justify-content: space-between; align-items: center; padding: 1.5rem;` и т.д.
  - Поместить кнопки ("В редактор", "Файлы", "Скачать", "Удалить") в flex-контейнер справа с `gap: 8px; flex-wrap: wrap;`.
  - Установить `#templatesContainer` стиль `flex-direction: column`.
- Реализовать функцию `loadRequests()` для загрузки заявок на привязку разработчика с эндпоинта `/api/developer/requests`.
- Реализовать функцию `handleRequestAction(reqId, action)` для отправки действий принятия/отклонения заявок.
- Добавить автоматический вызов `loadRequests()` при загрузке дашборда для разработчиков (внутри `loadSites()` или при инициализации).

### Деплоймент

#### [MODIFY] [scratch/deploy_changes.ps1](file:///c:/Users/9/Desktop/meloddyCMS/scratch/deploy_changes.ps1)
- Добавить `"public/css/style.css"` в массив файлов `$files`, чтобы обновленные стили загрузились на сервер.

## 3. План верификации

### Ручная проверка (Локально)
1. Открыть локальный дашборд. Убедиться, что на ширине экрана от 1440px контент прижат влево и ограничен 1400px.
2. Проверить вкладку "Мои шаблоны": карточки должны отображаться как горизонтальные строки с кнопками управления справа.
3. Проверить вкладку "Заявки на привязку": убедиться, что тестовые заявки (при наличии) выводятся в стиле CMS с кнопками действий.

### Верификация на сервере (После деплоя)
1. Запустить скрипт деплоя `powershell -ExecutionPolicy Bypass -File .\scratch\deploy_changes.ps1`.
2. Проверить работу на боевом домене [meloddy-crm.ru](https://meloddy-crm.ru/dashboard.html).
