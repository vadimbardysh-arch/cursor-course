# Налаштування Google Sheets для трекінгу прогресу

Ця інструкція допоможе підключити автоматичну відправку результатів квізів у Google Sheet.
Час: ~5 хвилин.

---

## Крок 1: Створи Google Sheet

1. Відкрий [Google Sheets](https://sheets.google.com)
2. Створи нову таблицю, назви її **"Cursor Course Progress"**
3. В першому рядку додай заголовки:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| User | Module | Score | Total | Date | Passed |

---

## Крок 2: Створи Google Apps Script

1. В Google Sheet натисни **Розширення → Apps Script**
2. Видали весь код і встав цей:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.user,
    'Module ' + data.module,
    data.score,
    data.total,
    new Date(data.date).toLocaleString('uk-UA'),
    data.passed ? 'Yes' : 'No'
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({status: 'ok'}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Натисни **Ctrl+S** (або Cmd+S) щоб зберегти
4. Назви проект: "Course Tracker"

---

## Крок 3: Опублікуй як Web App

1. Натисни **Deploy → New deployment**
2. Натисни шестірню зліва → вибери **Web app**
3. Налаштування:
   - **Description:** Course Progress Tracker
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Натисни **Deploy**
5. Підтверди доступ (натисни "Authorize access" → вибери свій акаунт → "Allow")
6. **Скопіюй URL** (він виглядає як `https://script.google.com/macros/s/ABC.../exec`)

---

## Крок 4: Підключи до курсу

1. Відкрий файл `Course/js/app.js`
2. Знайди рядок:
   ```
   const GOOGLE_SHEET_URL = '';
   ```
3. Встав скопійований URL між лапками:
   ```
   const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/YOUR_URL_HERE/exec';
   ```
4. Збережи файл

---

## Готово!

Тепер кожен раз, коли хтось проходить квіз, результат автоматично з'являється в Google Sheet.

### Як читати таблицю:

| User | Module | Score | Total | Date | Passed |
|------|--------|-------|-------|------|--------|
| Олена | Module 0 | 5 | 5 | 02.04.2026, 14:30 | Yes |
| Марко | Module 0 | 4 | 5 | 02.04.2026, 15:00 | Yes |
| Олена | Module 1 | 3 | 4 | 02.04.2026, 14:45 | Yes |

### Бонус: зведена таблиця

Для красивого дашборду можеш створити другий лист (Sheet2) з формулами:
- `=UNIQUE(A2:A)` — список всіх учнів
- `=COUNTIFS(A:A, "Олена", F:F, "Yes")` — скільки модулів пройшла Олена
- Або просто попроси Cursor: "Створи зведену таблицю прогресу з Sheet1"
