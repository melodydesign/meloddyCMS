# UI-Kit & Дизайн-система Лендинга meloddyCMS

Данный документ содержит полное описание дизайн-токенов, стилей компонентов, типографики и анимационных эффектов, используемых на лендинге meloddyCMS. Он служит эталоном для будущего редизайна панели управления (CMS/CRM) в едином современном стиле.

---

## 1. Цветовая палитра (Color Tokens)

Дизайн лендинга сочетает чистую светлую тему, глубокие акцентные градиенты и контрастную тёмную тему (используется для блоков разработчиков / IDE).

### Основные цвета (Светлая тема)
| Токен | Значение | Описание |
| :--- | :--- | :--- |
| `--bg-main` | `#FFFFFF` | Основной фон страниц |
| `--bg-secondary` | `#F9FAFB` | Фоновый цвет для контрастных секций и блоков |
| `--text-primary` | `#09090B` | Основной текст (глубокий угольный цвет) |
| `--text-muted` | `#71717A` | Вторичный/приглушенный текст |
| `--border-color` | `#E4E4E7` | Цвет тонких границ, разделителей и рамок |
| `--accent-blue` | `rgb(37, 99, 235)` | Основной синий акцент (Royal Blue, `#2563EB`) |
| `--success` | `#10B981` | Зеленый цвет успеха (для уведомлений и статусов) |

### Градиенты и Акценты
- **Фиолетово-синий градиент (Текст и Кнопки):**
  `linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)` (переход от ярко-фиолетового `#8B5CF6` к неоново-синему `#3B82F6`). Используется для класса `.text-gradient` и подсветки фоновых сфер.
- **Интерактивный градиент на ховере:**
  Радиальный градиент с подсветкой по координатам курсора мыши (используется в карточках):
  `radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(37, 99, 235, 0.15), transparent 40%)`

### Тёмная тема (Monster IDE / Панель разработчика)
| Элемент | Цвет / Код | Описание |
| :--- | :--- | :--- |
| Фон IDE | `#0D0D0D` | Чистый черный матовый фон |
| Границы блоков | `#222222` / `#333333` | Тонкие контрастные границы |
| Шапка окна | `#1A1A1A` | Фон панели вкладок |
| Ключевые слова | `#FF7B72` | Мягкий красный |
| Функции | `#D2A8FF` | Пастельный фиолетовый |
| Строки | `#A5D6FF` | Светло-голубой |
| Комментарии | `#8B949E` | Приглушенный серый |
| Переменные | `#79C0FF` | Ярко-синий |

---

## 2. Типографика (Typography)

Система построена на современном геометрическом гротеске **Inter**, обеспечивающем отличную читаемость.

- **Основной шрифт:** `font-family: 'Inter', sans-serif;`
- **Особенности заголовков:** Сближенный межбуквенный интервал `letter-spacing: -0.02em` и высокая насыщенность `font-weight: 700`.

### Размеры шрифтов (Responsive Typography)
| Тег / Класс | Размер (Desktop) | Размер (Mobile) | Межстрочный интервал (Line Height) |
| :--- | :--- | :--- | :--- |
| `h1` | `clamp(2.5rem, 5vw, 4.5rem)` | `2rem` | `1.1` |
| `h2` | `clamp(2rem, 4vw, 3rem)` | `1.85rem` | `1.2` |
| `h3` | `1.25rem` | `1.1rem` | `1.3` |
| `p` / Боди | `1.125rem` (`18px`) | `1rem` (`16px`) | `1.6` (Desktop) / `1.5` (Mobile) |
| Подзаголовки | `14px` | `12px` | `1.4` |

---

## 3. Сетка, Контейнеры и Отступы (Layout & Spacing)

- **Максимальная ширина контента:** `1200px` (`--max-width`)
- **Внутренние отступы контейнера (`.container`):**
  - Десктоп (экран ≥ 768px): `40px` с каждой стороны.
  - Мобильный (экран < 768px): `24px` с каждой стороны.
- **Внешние отступы секций (Paddings):**
  - Десктоп: `120px 0` (сверху/снизу).
  - Мобильный: `60px 0`.

### Сетка Bento Grid (`.features-grid`):
Используется CSS Grid для создания асимметричных премиальных раскладок карточек.
```css
.features-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
}
@media (min-width: 768px) {
    .features-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
    .features-grid { grid-template-columns: repeat(4, 1fr); }
    .span-2 { grid-column: span 2; } /* Широкая карточка на 2 колонки */
}
```

---

## 4. Компоненты UI (UI Components)

### 4.1 Кнопки (`.btn`)
Все кнопки имеют полностью скругленные края (pill-shaped) и плавные микро-анимации сдвига вверх при наведении.
```css
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 24px;
    border-radius: 99px;
    font-weight: 500;
    font-size: 15px;
    transition: all 0.2s ease;
}
```

- **Первичная кнопка (`.btn-primary`):**
  - Стили: `background-color: #0F0F0F`, `color: #FFFFFF`.
  - Ховер: `background-color: #27272A`, сдвиг `transform: translateY(-2px)`, мягкая тень `box-shadow: 0 10px 20px -10px rgba(0,0,0,0.2)`.
- **Акцентная кнопка (`.btn-accent`):**
  - Стили: `background-color: var(--accent-blue)` (`#2563EB`).
  - Ховер: `filter: brightness(1.05)`, сдвиг `translateY(-2px)`, неоновое свечение `box-shadow: 0 10px 20px -10px rgba(37,99,235,0.5)`.
- **Контурная кнопка (`.btn-outline`):**
  - Стили: `background-color: transparent`, граница `1px solid var(--border-color)`.
  - Ховер: `background-color: var(--bg-secondary)`.

### 4.2 Стеклянные карточки (`.feature-card`)
Стиль стеклянного минимализма (Glassmorphism), плавно реагирующий на наведение.
```css
.feature-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    padding: 32px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 24px rgba(0,0,0,0.02);
}
.feature-card:hover {
    box-shadow: 0 12px 32px rgba(37, 99, 235, 0.1);
    transform: translateY(-4px);
    border-color: rgba(37, 99, 235, 0.3);
}
```

### 4.3 Иконки карточек (`.feature-icon`)
Маленькие квадратные плашки под SVG-иконки.
- Размеры: `48px x 48px`, скругление `12px`, граница `--border-color`.
- Анимация при наведении на саму карточку:
  ```css
  .feature-card:hover .feature-icon {
      transform: scale(1.15) rotate(3deg);
      background-color: var(--bg-main);
      border-color: rgba(37, 99, 235, 0.5);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  }
  ```

### 4.4 Элементы форм и инпуты (`.contact-form`)
Контрастные поля ввода с мягким фокусом.
- **Обычное состояние:**
  `background: #F4F4F5` (светло-серый), `border: 1px solid transparent`, скругление `12px`, паддинг `16px 20px`.
- **Состояние фокуса (`:focus`):**
  `background: #FFFFFF`, граница `var(--accent-blue)`, внешнее кольцо свечения: `box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2)`.

### 4.5 Тарифы и FAQ
- **Тарифный значок (`.pricing-badge`):**
  Синий фон (`--accent-blue`), скругление `99px`, белый мелкий жирный текст `font-weight: 600`, `font-size: 0.8rem`.
- **Карточка тарифа:**
  Большой паддинг `56px`, граница `1px solid rgba(0, 0, 0, 0.06)`, крупная тень `box-shadow: 0 20px 60px rgba(0, 0, 0, 0.06)`. Кнопка тарифа имеет скругление `12px`.
- **Вопросы FAQ (`.faq-item`):**
  Вопросы открываются плавно по клику (`transition: max-height 0.3s ease-out`).
  Круглая иконка плюса (`.faq-icon`) размером `32x32px` при открытии окрашивается в синий цвет и поворачивается на 45 градусов (`transform: rotate(45deg)`).

---

## 5. Эффекты и Анимация (Animations & Visual Effects)

1. **3D Эффект при скролле (3D Scroll Perspective):**
   Применяется к обертке главного скриншота панели в секции Hero:
   - Родитель: `perspective: 1200px;`
   - Дочерний элемент: `transform: rotateX(25deg) scale(0.9); transform-origin: center top;` (по мере скролла наклон выпрямляется с помощью JS).
2. **Парящие фоновые сферы (`.hero-sphere`):**
   Абсолютно позиционированные цветные диски с огромным размытием (`filter: blur(100px)`) и анимацией покачивания:
   ```css
   @keyframes floatHeroSphere {
       0% { transform: translate(0, 0) scale(1); }
       100% { transform: translate(50px, 50px) scale(1.1); }
   }
   ```
3. **Плавный скролл всей страницы:**
   Реализован на чистом CSS для более премиального пользовательского опыта:
   `html { scroll-behavior: smooth; }`
