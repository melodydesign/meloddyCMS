# Mini-plan: Width Fix

## 1. Цель
Восстановить отображение контента на всю ширину экрана (100% ширины) на всех страницах CMS для широких экранов, исправив ограничение `max-width: 1400px` в медиа-запросе на `max-width: 100%`.

## 2. Предлагаемые изменения

### [MODIFY] [public/css/style.css](file:///c:/Users/9/Desktop/meloddyCMS/public/css/style.css)
- В медиа-запросе `@media (min-width: 1440px)` в самом конце файла заменить `max-width: 1400px;` на `max-width: 100%;`:
```css
@media (min-width: 1440px) {
    .dashboard-container,
    .fm-container,
    .profile-dashboard-grid,
    .pricing-cards-container,
    .glass-panel,
    .docs-content-area,
    #panelAnalytics {
        max-width: 100%;
    }
    .stats-grid {
        grid-template-columns: repeat(5, 1fr) !important;
    }
    #sitesContainer {
        grid-template-columns: 1fr !important;
    }
}
```

## 3. Шаги реализации
1. Изменить `public/css/style.css`, установив `max-width: 100%` в медиа-запросе.
2. Проверить локально корректность отображения.
3. Запустить скрипт деплоя `powershell -ExecutionPolicy Bypass -File .\scratch\deploy_changes.ps1` для обновления файла на сервере.
4. Проверить отображение на боевом сайте https://meloddy-crm.ru/dashboard.html.

## 4. Верификация
Выполнить HTTP-запрос к файлу стилей на боевом сервере и убедиться, что свойство изменилось:
`curl.exe -s https://meloddy-crm.ru/css/style.css | Select-String -Pattern "max-width: 100%"`
