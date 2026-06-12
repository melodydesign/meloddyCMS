# План реализации: Исправление сетки настроек и базы знаний

## Список изменений по файлам

### 1. [settings.html](file:///c:/Users/9/Desktop/meloddyCMS/public/settings.html)
- **Email инпут**:
  - Обновить инпут `emailInput` (строка ~116): добавить класс `style="background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.5rem; color: var(--text-main); width: 100%;"` для соответствия `usernameInput`.
- **Скрытие пустого блока привязки**:
  - Добавить `id="devClientCard"` внешнему контейнеру блока «Привязка к разработчику» (строка ~159):
    ```html
    <div id="devClientCard" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2rem; margin-top: 2rem; display: none;">
    ```
  - Обновить JS-код (строка ~520): при проверке авторизации показывать `devClientCard` только для клиентов:
    ```javascript
    if (authData.user.role === 'client') {
        const devTabBtn = document.getElementById('tabSettingsDeveloper');
        if (devTabBtn) devTabBtn.style.display = 'none';
        const devClientCard = document.getElementById('devClientCard');
        if (devClientCard) devClientCard.style.display = 'block';
        if (clientSec) clientSec.style.display = 'block';
    } else {
        const devClientCard = document.getElementById('devClientCard');
        if (devClientCard) devClientCard.style.display = 'none';
    }
    ```

### 2. [dashboard.html](file:///c:/Users/9/Desktop/meloddyCMS/public/dashboard.html)
- **Вкладка «Настройки» (`panelSettings`)**:
  - Удалить `max-width: 800px` и `style="display: flex; flex-direction: column; gap: 30px;"` у формы `#siteSettingsForm`.
  - Внутри формы `#siteSettingsForm` раскидать контент в Grid на две колонки для десктопа:
    ```html
    <div class="bento-grid-2">
        <!-- Левая колонка: Основное -->
        <div class="bento-card">...</div>
        <!-- Правая колонка: Домен и Favicon -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
            <div class="bento-card">...Домен...</div>
            <div class="bento-card">...Favicon...</div>
        </div>
    </div>
    ```
- **Вкладка «SEO & Интеграции» (`panelSeo`)**:
  - Удалить `max-width: 800px`.
  - Обернуть внутренний контейнер в `.bento-grid-2`:
    - Левая колонка: Bento-карточки для «Уведомления в Telegram» и «Яндекс.Метрика».
    - Правая колонка: Bento-карточки для «robots.txt» и «Sitemap.xml».
- **Вкладка «Доступ & Бэкапы» (`panelAccess`)**:
  - Удалить `max-width: 800px`.
  - Обернуть внутренний контейнер в `.bento-grid-2`:
    - Левая колонка: Bento-карточка для «Доступ разработчика».
    - Правая колонка: Bento-карточка для «Резервное копирование».
- **Вкладка «Опасная зона» (`panelDanger`)**:
  - Удалить `max-width: 800px`.
  - Обернуть внутренний контейнер в `.bento-grid-2` (две колонки):
    - Левая колонка: Bento-карточка для «Передача прав».
    - Правая колонка: Bento-карточка для «Удаление сайта» (с красной границей/акцентом).

- **Добавить стили в `<style>` секцию `dashboard.html`** для сеток и карточек:
  ```css
  .bento-grid-2 {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
      gap: 24px;
  }
  .bento-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 2rem;
  }
  @media (max-width: 991px) {
      .bento-grid-2 {
          grid-template-columns: 1fr;
      }
  }
  ```

### 3. [docs.html](file:///c:/Users/9/Desktop/meloddyCMS/public/docs.html)
- **Стилизация Базы знаний под Bento-дизайн**:
  - Оформить сайдбар оглавления `.docs-toc` как Bento-карточку:
    ```css
    .docs-toc {
        position: sticky;
        top: 110px;
        width: 280px;
        flex-shrink: 0;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        max-height: calc(100vh - 140px);
        overflow-y: auto;
        box-shadow: var(--shadow-sm);
    }
    ```
  - Оформить каждую статью `.docs-section` как Bento-карточку:
    ```css
    .docs-section {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 2.5rem;
        margin-bottom: 2rem;
        box-shadow: var(--shadow-sm);
        scroll-margin-top: 100px;
    }
    ```
  - У `.docs-hero` добавить белый (или соответствующий теме) Bento-фон и padding:
    ```css
    .docs-hero {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 2.5rem;
        margin-bottom: 2rem;
        box-shadow: var(--shadow-sm);
    }
    ```
  - Убрать лишние двойные отступы: задать `.docs-page-container` padding `24px 0` (так как внешний `.main-content` уже имеет отступы `24px 40px`).
  - Исправить разметку в `.docs-tabs-wrapper`, сделав ее segmented-tabs, совпадающую по стилю с другими страницами панели.

---

## План верификации

### Локальная проверка
- Проверить синтаксис HTML/CSS во всех трех файлах.

### Деплой
- Запустить `python deploy.py`.

### Ручное тестирование
1. Открыть Настройки системы: убедиться, что инпут Email стилизован правильно, а пустой блок разработчика скрыт (если залогинен разработчик).
2. Открыть Настройки проекта (Управление сайтом): убедиться, что все разделы (Настройки, SEO, Доступы, Опасная зона) выстроены в красивые Bento-колонки.
3. Открыть Базу знаний: проверить, что оглавление и все разделы статей имеют рамки, скругления и Bento-структуру.
