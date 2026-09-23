# Промпты экранов BCC Leasing

Сгенерировано встроенным ImageGen. Основа — приложенный пользователем скриншот мобильного калькулятора. Доступ к указанному Figma-фрейму через интеграцию не получен. Реализация и публикация веб-сервиса не выполнялись.

Состояния: обычный калькулятор; открытый помощник с голосовым вводом; калькулятор после применения условий.

## Экран 1

```text
Use case: ui-mockup. Create one polished production-quality desktop WEB SCREEN image, a realistic flat UI screenshot, approximately 1600x1100 landscape. This is state 1 of a consistent three-state BCC Leasing web calculator design. Output only the screen, no device mockup, no browser chrome, no design board, no perspective.

Input image 1 is a STYLE REFERENCE, not the target to reproduce. It shows the existing BCC Leasing mobile application. Adapt its exact visual language to desktop: bright white, neutral very light gray inputs (#EAEAEF), graphite text (#323338), muted gray labels, saturated green (#00AC83) primary buttons and slider thumb, charcoal selected term pills, 12px rounded inputs and buttons, thin pale gray dividers, a clean Suisse/Inter-like sans-serif. Restrained, calm, readable banking UI with generous spacing. No purple, gradients, illustrations, stock photography, robot avatars, marketing banners, fake sidebar navigation or shadows.

Composition: pale near-white page; narrow white top header with "BCC Leasing" on left and "Рус" on right. Centered content width about 1200px with 80px outer margins. Below header a small breadcrumb "Лизинг / Калькулятор". Main title "Калькулятор лизинга" at left and an outlined green button with a tiny sparkle icon "Подобрать с ИИ" on right, aligned in the same title row. Subtitle "Рассчитайте платеж и выберите удобные условия".

Main area: balanced TWO COLUMNS. Left form about 60% width, right summary about 36%, gap32px. The left white panel heading "Параметры лизинга". Compact segmented customer selector "ИП" selected dark charcoal and "ТОО" unselected gray. A full-width gray selector labelled "Автомобиль" with "Hyundai Tucson · 2026" and a chevron. Small secondary text "Общий каталог авто". Gray price input labelled "Стоимость автомобиля", value "15 000 000 ₸", with a subtle green slider below inside the control. Gray advance control labelled "Первоначальный взнос", value "3 000 000 ₸" and a right-aligned "20%" dropdown. Section label "Срок лизинга" and three rounded pills "37 мес", "48 мес", "60 мес". ONLY "48 мес" is selected dark charcoal with white text. Small muted text below "Расчет по текущим условиям".

Right panel: very light gray rounded summary card titled "Ваш расчет". Huge bold number "392 218 ₸" and smaller "в месяц". Thin divider. Four neatly aligned key/value rows: "Сумма финансирования" — "12 000 000 ₸"; "Первоначальный взнос" — "3 000 000 ₸"; "Срок" — "48 месяцев"; "Ставка" — "24,15% годовых". A modest text link "Показать график платежей". Wide solid green primary button with white text "Продолжить оформление". Below in small muted text, cleanly wrapped: "Предварительный расчет. Не является офертой.".

Typography and numbers must be perfectly legible, correctly spelled Russian, exactly as quoted. Keep all layout elements fully on canvas. This screen shows a NORMAL CALCULATOR with the assistant closed, only its obvious launch button. No chat conversation yet. Make the form and result large enough to read, compact enough for one desktop viewport. Do not include source annotations, APIs, developer notes or approval/loan-granted claims.

```

## Экран 2

```text
Use case: ui-mockup. Edit the provided desktop BCC Leasing screen into STATE 2: the AI assistant is OPEN. This is a high fidelity production UI screen, not a poster. Output a single flat desktop screenshot at the SAME landscape aspect ratio, visual scale and resolution as the reference. Input image 1 is the exact design to preserve. Keep the header, fonts, colors, entire left calculator form, spacing, background, field shapes and values visually identical. It is critical to preserve design continuity.

Only replace the right-hand "Ваш расчет" summary card with an OPEN CHAT panel of the same width and aligned at the same top edge, continuing to the bottom margin. It should feel like part of this very same web app, restrained, readable, bright white and green. Do not darken or blur the calculator. Left form remains 15 000 000 ₸ price, 3 000 000 ₸ advance, 20%, 48 months selected. DO NOT select 60 months in the calculator yet: the user has not applied the suggestion. Top launch button may read "Помощник открыт" with a green sparkle. No duplicated summary card, no robot avatar, no illustrations, no marketing copy.

Chat panel header: tiny green sparkle, bold "ИИ-помощник", close X at far right. Small subtitle "Подберем платеж под ваш бюджет". Thin divider.

Conversation, with comfortable whitespace and exact Russian text:
1. A right-aligned light gray user message bubble: "Хочу платить до 350 000 ₸ в месяц. На аванс — до 3 000 000 ₸.". It must be clearly user-authored, no avatar required.
2. A left-aligned assistant paragraph: "Подходит вариант на 60 месяцев. Аванс останется прежним — 3 000 000 ₸.".
3. A green-tinted proposal card with subtle green border. Top small label "В вашем бюджете". Large dark bold "349 057 ₸" and small "в месяц". Two compact key/value rows: "Срок" / "60 месяцев" and "Аванс" / "3 000 000 ₸ · 20%". A smaller note "Срок увеличится на 12 месяцев". Solid green full-width button "Применить условия" with white text. This action changes the calculator, NOT submits an application.
4. Small gray text below card "Предварительный расчет".

At panel bottom a comfortably sized outlined rounded multiline text composer, placeholder "Напишите или скажите…". Inside bottom right: a clear outlined microphone icon with enough tap area, then a small GREEN circular send button with white upward arrow. The microphone is important because the service supports speech. Keep the composer fully visible, no clipped footer.

The result card and chat must fit within the viewport. Use concise exact copy as above, legible Russian, correct numbers. Do not add irrelevant chat messages, fake financial approvals, API names, implementation details or made-up savings promises. Preserve the large calm form on the left. This is an everyday banking web app in the exact reference aesthetic.

```

## Экран 3

```text
Use case: ui-mockup. Edit the provided desktop BCC Leasing calculator into STATE 3: the customer has pressed Apply in the AI assistant, so the assistant is closed and the calculator now has the selected conditions. Produce a single flat desktop UI screenshot in the SAME landscape aspect ratio, resolution, typography, colors, spacing and design system as the provided image. Image 1 is the exact layout and style invariant. No device, no browser chrome, no new design language.

Preserve the BCC Leasing header, language selector, breadcrumb, "Калькулятор лизинга" title, subtitle, "Подобрать с ИИ" outline button, two main panels and all shared controls. Preserve Hyundai Tucson · 2026, ИП selected, Общий каталог авто, 15 000 000 ₸ asset price, advance3 000 000 ₸ and20%. Correct exact changes:

1. Add a slim, restrained pale-green success strip between the title area and the main panels, with a small green check and text "Условия применены: срок — 60 месяцев". Include small secondary "Отменить" action at the right end. This strip is about successful application of settings, NOT a loan approval. If needed shift content up slightly or make gaps smaller to keep all content visible; do not shrink readability.
2. In term pills "37 мес", "48 мес", "60 мес", ONLY "60 мес" is selected dark charcoal, other pills light gray.
3. Right summary title stays "Ваш расчет". Dominant new amount "349 057 ₸", smaller "в месяц". Small pale-green check badge "В бюджете до 350 000 ₸".
4. Summary key/value rows precisely: "Сумма финансирования" — "12 000 000 ₸"; "Первоначальный взнос" — "3 000 000 ₸"; "Срок" — "60 месяцев"; "Ставка" — "24,55% годовых".
5. Small muted comparison under rows, on two lines: "Было 392 218 ₸ при сроке 48 месяцев" and "Платеж ниже, срок больше на 12 месяцев". Keep it clear that reduced monthly payment comes with longer term, not an assertion of total-cost savings.
6. Retain green text link "Показать график платежей", wide green button "Продолжить оформление", and gray note "Предварительный расчет. Не является офертой.".

Keep calm white/pale-gray banking aesthetic from the reference, graphite bold numbers, gray labels and filled gray inputs, BCC green #00AC83 actions. Exact readable Russian text and numbers. Everything fully on canvas, no overlaps, no garbled labels. No chat panel on this state, no extraneous charts, no confetti or robot art, no API jargon.

```
