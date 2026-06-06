# UI Kit — Boltshift Design System для meloddyCMS

> Это полный UI Kit, основанный на анализе эталонного дизайна Boltshift Dashboard.
> Все значения проверены визуально по предоставленному скриншоту.

---

## 1. Шрифтовая система

| Свойство | Значение |
|----------|----------|
| Семейство | `Inter` (Google Fonts) |
| Fallback | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| Base размер | `16px` |
| Line-height (body) | `1.5` |
| Line-height (заголовки) | `1.2` |
| Letter-spacing (body) | `-0.01em` |
| Letter-spacing (заголовки) | `-0.02em` |

### Размеры текста

| Роль | Размер | Вес | Пример |
|------|--------|-----|--------|
| H1 (Page Title) | `24px` / `1.5rem` | 700 | "Sales Overview" |
| H2 (Section Title) | `18px` / `1.125rem` | 600 | "Performance Overview" |
| H3 (Card Title) | `14px` / `0.875rem` | 500 | "Total Sales" |
| Body | `14px` / `0.875rem` | 400 | Обычный текст |
| Caption/Label | `12px` / `0.75rem` | 500 | "Last month: 2345" |
| Badge | `12px` / `0.75rem` | 600 | "↑ 4.9%" |
| Nav item | `14px` / `0.875rem` | 500 | "Dashboard", "Analytics" |
| Stat value | `32px` / `2rem` | 700 | "2500", "$8,220.64" |

---

## 2. Цветовая палитра

### Light Theme (основная)

```css
:root {
    /* === BACKGROUNDS === */
    --bg-body: #F8F9FB;
    --bg-topbar: #FFFFFF;
    --bg-card: #FFFFFF;
    --bg-card-active: #EEF4FF;
    --bg-hover: #F3F4F6;
    --bg-active: #EEF4FF;
    --bg-input: #FFFFFF;
    --bg-input-focus: #FFFFFF;

    /* === BORDERS === */
    --border: #E5E7EB;
    --border-light: #F0F1F3;
    --border-active: #BFDBFE;
    --border-focus: #2563EB;

    /* === TEXT === */
    --text-main: #111827;
    --text-secondary: #374151;
    --text-muted: #6B7280;
    --text-placeholder: #9CA3AF;
    --text-inverse: #FFFFFF;

    /* === PRIMARY (Blue) === */
    --primary: #2563EB;
    --primary-hover: #1D4ED8;
    --primary-light: #EEF4FF;
    --primary-text: #FFFFFF;

    /* === SEMANTIC === */
    --success: #10B981;
    --success-bg: rgba(16, 185, 129, 0.1);
    --danger: #EF4444;
    --danger-bg: rgba(239, 68, 68, 0.1);
    --warning: #F59E0B;
    --warning-bg: rgba(245, 158, 11, 0.1);

    /* === SHADOWS === */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
    --shadow-lg: 0 10px 25px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03);
    --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);

    /* === RADII === */
    --radius-xs: 6px;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --radius-pill: 9999px;
}
```

### Dark Theme

```css
[data-theme="dark"] {
    --bg-body: #0F1117;
    --bg-topbar: #161820;
    --bg-card: #1C1E27;
    --bg-card-active: rgba(37, 99, 235, 0.12);
    --bg-hover: rgba(255, 255, 255, 0.05);
    --bg-active: rgba(37, 99, 235, 0.15);
    --bg-input: #1C1E27;
    --bg-input-focus: #22242E;

    --border: #2D3039;
    --border-light: #23252D;
    --border-active: rgba(37, 99, 235, 0.4);
    --border-focus: #2563EB;

    --text-main: #F3F4F6;
    --text-secondary: #D1D5DB;
    --text-muted: #9CA3AF;
    --text-placeholder: #6B7280;
    --text-inverse: #111827;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 25px -3px rgba(0, 0, 0, 0.5);
    --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.4);
}
```

---

## 3. Компоненты

### 3.1 Top-Bar Navigation

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔷 meloddyCMS    ╔═════════╗ Analytics  Analytics  Analytics   ⚙ 👤│
│                   ║Dashboard║                                      │
│                   ╚═════════╝                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Спецификация:**
- Высота: `64px`
- Фон: `--bg-topbar` (`#FFFFFF`)
- Нижний бордер: `1px solid --border`
- Padding: `0 32px`
- Z-index: `1000`
- Лого: `font-size: 1.1rem`, `font-weight: 700`
- Pill-навигация:
  - Inactive: `color: --text-muted`, `padding: 8px 16px`, `border-radius: 9999px`
  - Active: `background: #111827`, `color: #FFFFFF`, `border-radius: 9999px`, `font-weight: 500`
  - Hover (inactive): `background: --bg-hover`
- Иконки справа: `width: 36px`, `height: 36px`, `border-radius: 8px`, hover → `--bg-hover`
- Аватар: `width: 36px`, `height: 36px`, `border-radius: 50%`

### 3.2 Stat Cards

```
┌───────────────────────────────────┐
│  Total Sales           🛒        │
│  ████████████                     │
│  2500    ↑ 4.9%                  │
│  Last month: 2345                 │
└───────────────────────────────────┘
```

**Спецификация:**
- `background: --bg-card` (`#FFFFFF`)
- `border: 1px solid --border`
- `border-radius: 12px`
- `padding: 20px 24px`
- `min-height: 120px`
- Активная карточка: `background: --bg-card-active`, `border-color: --border-active`
- Заголовок: `font-size: 0.8rem`, `color: --text-muted`, `font-weight: 500`
- Значение: `font-size: 2rem`, `font-weight: 700`, `color: --text-main`
- Дельта (бейдж):
  - Позитивная: `background: --success-bg`, `color: --success`, `font-size: 0.75rem`, `padding: 2px 8px`, `border-radius: 9999px`
  - Негативная: `background: --danger-bg`, `color: --danger`
- Подпись: `font-size: 0.75rem`, `color: --text-muted`
- Иконка: `width: 40px`, `height: 40px`, `border-radius: 10px`, `background: --primary-light`

### 3.3 Buttons

| Вариант | Background | Color | Border | Radius |
|---------|-----------|-------|--------|--------|
| Primary | `#2563EB` | `#FFFFFF` | none | `8px` |
| Primary hover | `#1D4ED8` | `#FFFFFF` | none | `8px` |
| Outline | `#FFFFFF` | `#374151` | `1px solid #E5E7EB` | `8px` |
| Outline hover | `#F9FAFB` | `#111827` | `1px solid #D1D5DB` | `8px` |
| Ghost | transparent | `#6B7280` | none | `8px` |
| Ghost hover | `#F3F4F6` | `#111827` | none | `8px` |
| Pill Filter (active) | `#2563EB` | `#FFFFFF` | none | `9999px` |
| Danger | `rgba(239,68,68,0.1)` | `#EF4444` | `1px solid rgba(239,68,68,0.2)` | `8px` |

**Общие свойства:**
- `padding: 10px 20px`
- `font-size: 0.875rem`
- `font-weight: 600`
- `cursor: pointer`
- `transition: all 0.15s ease`
- Hover: `transform: translateY(-1px)`, `box-shadow: --shadow-md`

### 3.4 Inputs

**Спецификация:**
- `background: #FFFFFF`
- `border: 1px solid #E5E7EB`
- `border-radius: 8px`
- `padding: 10px 14px`
- `font-size: 0.9rem`
- `color: --text-main`
- Placeholder: `color: --text-placeholder`
- Focus:
  - `border-color: #2563EB`
  - `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1)`
  - `outline: none`

### 3.5 Cards / Panels

**Спецификация:**
- `background: #FFFFFF`
- `border: 1px solid #E5E7EB`
- `border-radius: 12px`
- `padding: 24px`
- `box-shadow: --shadow-card`
- Без `backdrop-filter`, без `blur` — чистый solid дизайн
- Hover (опционально): `box-shadow: --shadow-md`, `border-color: #D1D5DB`

### 3.6 Dropdowns / Select

**Спецификация:**
- Кнопка: как outline button, с chevron-иконкой справа
- Dropdown list:
  - `background: #FFFFFF`
  - `border: 1px solid #E5E7EB`
  - `border-radius: 8px`
  - `box-shadow: --shadow-lg`
  - `padding: 4px`
- Item: `padding: 8px 12px`, `border-radius: 6px`
- Item hover: `background: #F3F4F6`
- Item active: `background: #EEF4FF`, `color: #2563EB`

### 3.7 Tabs

**Pill-стиль (как в Boltshift top-bar):**
- Container: `display: flex`, `gap: 4px`, `background: transparent`
- Tab item:
  - Inactive: `color: --text-muted`, `padding: 8px 16px`, `border-radius: 9999px`
  - Active: `background: #111827`, `color: #FFFFFF`, `font-weight: 500`
  - Hover: `background: --bg-hover`

**Underline-стиль (для sub-tabs):**
- `border-bottom: 2px solid transparent`
- Active: `border-bottom-color: #2563EB`, `color: #2563EB`

### 3.8 Tables

**Спецификация:**
- Header: `font-size: 0.75rem`, `color: --text-muted`, `text-transform: uppercase`, `letter-spacing: 0.05em`, `padding: 12px 16px`, `border-bottom: 1px solid --border`
- Body row: `padding: 14px 16px`, `border-bottom: 1px solid --border-light`
- Row hover: `background: #F9FAFB`
- Чекбокс в строке: `width: 16px`, `height: 16px`, `border-radius: 4px`, `border: 1px solid #D1D5DB`

### 3.9 Modals

**Спецификация:**
- Overlay: `background: rgba(0, 0, 0, 0.5)`, `backdrop-filter: blur(4px)`
- Content:
  - `background: #FFFFFF`
  - `border: 1px solid #E5E7EB`
  - `border-radius: 16px`
  - `box-shadow: --shadow-lg`
  - `padding: 28px`
  - `max-width: 540px`
- Header: flex, space-between, `margin-bottom: 24px`
- Title: `font-size: 1.25rem`, `font-weight: 700`
- Close button: `width: 32px`, `height: 32px`, `border-radius: 8px`, hover → `--bg-hover`

### 3.10 Toast Notifications

**Спецификация:**
- `background: #FFFFFF`
- `border: 1px solid #E5E7EB`
- `border-radius: 8px`
- `box-shadow: --shadow-lg`
- `padding: 14px 20px`
- Slide-in animation: `translateY(100%)` → `translateY(0)`

---

## 4. Spacing Scale

| Token | Value | Использование |
|-------|-------|---------------|
| `--space-1` | `4px` | Микро-отступы |
| `--space-2` | `8px` | Между элементами |
| `--space-3` | `12px` | Padding кнопок |
| `--space-4` | `16px` | Отступы внутри карточек |
| `--space-5` | `20px` | Секции |
| `--space-6` | `24px` | Главный padding карточек |
| `--space-8` | `32px` | Между секциями |
| `--space-10` | `40px` | Padding основного контента |

---

## 5. Анимации и Transitions

| Элемент | Свойство | Значение |
|---------|----------|----------|
| Кнопки | `transition` | `all 0.15s ease` |
| Карточки | `transition` | `all 0.2s ease` |
| Навигация | `transition` | `all 0.15s ease` |
| Модальные окна | `animation` | `fadeIn 0.2s ease, scaleIn 0.2s ease` |
| Hover lift | `transform` | `translateY(-1px)` (мягкий, минимальный) |

> **Ключевое отличие от текущего дизайна**: Boltshift использует **минимальные** анимации. Нет `translateY(-4px)`, нет `scale(1.15) rotate(3deg)`, нет `ambient-glow`. Всё строго, аккуратно, корпоративно.

---

## 6. Layout

### Desktop (>1024px)
```
┌──────────────────────────────────────────────────────────────┐
│                      TOP-BAR (64px)                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│    padding: 32px 40px                                        │
│                                                              │
│    Page Title + Actions                                      │
│                                                              │
│    ┌────┐ ┌────┐ ┌────┐ ┌────┐                              │
│    │Stat│ │Stat│ │Stat│ │Stat│   ← 4 колонки                │
│    └────┘ └────┘ └────┘ └────┘                              │
│                                                              │
│    ┌──────────────────┐ ┌──────────┐                        │
│    │  Chart (60%)     │ │ Donut    │  ← 2 колонки           │
│    └──────────────────┘ │ (40%)    │                        │
│                          └──────────┘                        │
│                                                              │
│    ┌────────────────────────────────────┐                    │
│    │  Table / Recent Orders             │                    │
│    └────────────────────────────────────┘                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Mobile (≤768px)
```
┌──────────────────────────┐
│ ☰  meloddyCMS            │  ← Burger + Logo
├──────────────────────────┤
│ Page Title               │
│ ┌────┐ ┌────┐           │
│ │Stat│ │Stat│  ← 2 cols │
│ └────┘ └────┘           │
│ ┌────┐ ┌────┐           │
│ │Stat│ │Stat│           │
│ └────┘ └────┘           │
│ ┌────────────────────┐   │
│ │     Chart          │   │
│ └────────────────────┘   │
│ ┌────────────────────┐   │
│ │     Table          │   │
│ └────────────────────┘   │
└──────────────────────────┘
```
