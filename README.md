# Open Student

אפליקציה לסטודנטים של האוניברסיטה הפתוחה לניהול קורסים, מטלות, מבחנים, התקדמות בתואר, קבוצות לימוד וטיימר פומודורו — במקום אחד.

הפרויקט בנוי עם Expo SDK 57,‏ React Native,‏ Expo Router ו־TypeScript. הנתונים האישיים של המשתמש נשמרים מקומית במכשיר; שירות קבוצות הלימוד משתמש ב־PostgreSQL דרך Neon.

## דרישות מוקדמות

- Node.js בגרסה `22.13` ומעלה
- npm
- Git
- להרצה ב־iOS: מחשב macOS עם Xcode עדכני ו־iOS Simulator
- להרצה ב־Android:‏ Android Studio,‏ Android SDK ואמולטור מוגדר
- אופציונלי: מסד PostgreSQL תואם Neon עבור קבוצות הלימוד ונתיבי ה־API

הגרסאות בפרויקט מותאמות ל־[Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/). מומלץ לא לשדרג חבילות Expo ידנית בלי לבדוק קודם את התיעוד של גרסה זו.

## התקנה

שכפלו את המאגר והתקינו את התלויות:

```bash
git clone https://github.com/ronka/openstudent.git
cd openstudent
npm install
```

## התחלה מהירה עם סוכן AI

לאחר שכפול המאגר, אפשר לתת לסוכן AI שמחובר ל־[Neon MCP](https://neon.com/docs/ai/neon-mcp-server) את הפרומפט הבא. הסוכן יתקין את התלויות, ייצור מסד נתונים נפרד לפיתוח, יגדיר את החיבור המקומי, יריץ migrations ו־seed, יוודא שהפרויקט תקין ויפעיל אותו.

> ל־Neon MCP יש הרשאות ניהול רחבות. יש להשתמש בתהליך הזה רק עבור סביבת פיתוח חדשה, לעבור על הפעולות שהסוכן מבקש לאשר, ולעולם לא לחבר אותו למסד נתונים של production.

```text
הכן את פרויקט Open Student להרצה מקומית מקצה לקצה.

1. קרא את AGENTS.md ואת README.md ופעל לפי ההנחיות שלהם. אל תשנה קוד שאינו נחוץ לצורך ההתקנה.
2. ודא שמותקנים Node.js 22.13 ומעלה ו-npm, ואז הרץ npm install.
3. השתמש ב-Neon MCP המחובר כדי ליצור פרויקט Neon חדש ונפרד לפיתוח עבור Open Student. אל תשתמש בפרויקט או במסד נתונים קיים של production.
4. צור או בחר database ו-branch לפיתוח, וקבל עבורם connection string ישיר ולא pooled, כדי שיתאים גם ל-Drizzle migrations.
5. קרא תחילה את קובץ .env אם הוא קיים. הוסף או עדכן בו רק את DATABASE_URL ושמור על כל ערך קיים שאינו קשור. אל תדפיס את ה-connection string בתשובה, בטרמינל או בלוגים, ואל תוסיף את .env ל-Git.
6. אין צורך ב-PostHog לפיתוח מקומי. אל תבקש ואל תגדיר EXPO_PUBLIC_POSTHOG_API_KEY או משתני PostHog אחרים.
7. הרץ npm run db:migrate ולאחר מכן npm run db:seed. אם פעולה נכשלת, אבחן ותקן רק בעיות setup שנמצאות בתחום המשימה, ואז נסה שוב.
8. הרץ npm test,‏ npm run lint ו-npx tsc --noEmit. דווח בבירור על כל כשל שנותר ואל תסתיר אותו.
9. הפעל את שרת הפיתוח עם npm start, השאר אותו רץ, ודווח איך לפתוח את האפליקציה ב-iOS, ב-Android או בדפדפן.

בסיום, סכם אילו משאבי Neon נוצרו, אילו פקודות עברו בהצלחה ואיך להריץ שוב את הפרויקט. אל תציג סודות או ערכי משתני סביבה.
```

אם Neon MCP עדיין אינו מוגדר בסוכן, אפשר להתקין ולחבר אותו באמצעות:

```bash
npx neon@latest mcp
```

## משתני סביבה

צרו קובץ `.env` בשורש הפרויקט. הקובץ מוחרג מ־Git ואין להעלות אותו למאגר.

```dotenv
# נדרש עבור נתיבי ה־API, מיגרציות וקבוצות לימוד
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

PostHog אינו נדרש לפיתוח מקומי. כאשר `EXPO_PUBLIC_POSTHOG_API_KEY` אינו מוגדר, לקוח האנליטיקה מושבת אוטומטית.

כל משתנה שמתחיל ב־`EXPO_PUBLIC_` נכלל באפליקציית הלקוח ואינו יכול להכיל סוד. את `DATABASE_URL` אסור לשנות ל־`EXPO_PUBLIC_DATABASE_URL`.

אם אינכם עובדים על קבוצות הלימוד או על נתיבי ה־API, אפשר להשאיר את `DATABASE_URL` לא מוגדר ולהריץ את מסכי האפליקציה המקומיים בלבד.

## הכנת מסד הנתונים

לאחר יצירת מסד PostgreSQL והגדרת `DATABASE_URL`, הפעילו את המיגרציות:

```bash
npm run db:migrate
```

אפשר לייצר מיגרציה חדשה לאחר שינוי הסכמה באמצעות:

```bash
npm run db:generate
```

הפקודה הבאה מוסיפה את רשומות האתחול שמוגדרות ב־`src/db/seed.ts`. היא אינה נדרשת להרצה רגילה ועלולה להוסיף רשומות כפולות אם מפעילים אותה יותר מפעם אחת:

```bash
npm run db:seed
```

## הרצת הפרויקט

הפעילו את שרת הפיתוח:

```bash
npm start
```

להרצה ישירה לפי פלטפורמה:

```bash
npm run ios
npm run android
npm run web
```

הפרויקט משתמש ביכולות Native, כולל widgets ו־development client. לכן לפיתוח מלא ב־iOS וב־Android יש להשתמש ב־development build דרך `npm run ios` או `npm run android`; Expo Go אינו מכסה את כל היכולות של הפרויקט.

בפעם הראשונה Expo עשוי ליצור מקומית את התיקיות `ios/` ו־`android/`. הן מוחרגות מהמאגר ונוצרות מחדש מההגדרות שב־`app.json`.

## בדיקות ואיכות קוד

```bash
# בדיקות
npm test

# ESLint
npm run lint

# בדיקת טיפוסים
npx tsc --noEmit
```

לפני פתיחת Pull Request, ודאו שכל שלוש הפקודות מסתיימות בהצלחה.

## פקודות שימושיות

| פקודה | תיאור |
| --- | --- |
| `npm start` | הפעלת שרת הפיתוח של Expo |
| `npm run ios` | בנייה והרצה מקומית ב־iOS Simulator |
| `npm run android` | בנייה והרצה מקומית באמולטור או במכשיר Android |
| `npm run web` | הרצת גרסת ה־Web |
| `npm test` | הרצת הבדיקות |
| `npm run lint` | בדיקת ESLint |
| `npm run db:migrate` | החלת מיגרציות על מסד הנתונים |
| `npm run db:generate` | יצירת מיגרציה חדשה מהסכמה |
| `npm run scrape:catalog` | יצירה מחדש של קטלוג הקורסים ממקור האוניברסיטה |

## תרומה לפרויקט

מצאתם באג, רעיון לשיפור או פיצ'ר שחסר? הדרך המועדפת לתרום היא באמצעות Pull Request:

1. צרו fork של המאגר.
2. פתחו branch ממוקד עבור השינוי.
3. בצעו את השינוי והוסיפו בדיקות מתאימות.
4. הריצו `npm test`,‏ `npm run lint` ו־`npx tsc --noEmit`.
5. פתחו Pull Request עם הסבר קצר על הבעיה, הפתרון ואופן הבדיקה.

אני אעבור על ה־Pull Request, אשאיר הערות במידת הצורך ואטפל במיזוג ובהפצה. אין צורך לפרסם builds, לבצע deployment או להגדיר חשבון EAS כדי לתרום לפרויקט.

## Skills לפיתוח בעזרת סוכני AI

המאגר כולל Skills שבהם נעשה שימוש במהלך פיתוח הפרויקט. המקור שלהם הוא המאגר האישי [ronka/skills](https://github.com/ronka/skills).

אני משתמש ב־Neon MCP כדי לאפשר לסוכני AI ליצור ולנהל מסדי נתונים וענפי פיתוח, לקבל connection string ולהריץ שינויים בסכמה ישירות מתוך סביבת הפיתוח. ה־MCP מיועד כאן לפיתוח ולבדיקות בלבד, ולא לגישה לנתוני production.

ה־Skills נשמרים תחת `.agents/skills/`, וקישורים תואמים עבור Claude נמצאים תחת `.claude/skills/`:

- `app-onboarding` — תכנון וביקורת של תהליכי onboarding
- `app-version-debug` — הצגת גרסה ותפריט debug באפליקציית Expo
- `apple-design` — עקרונות ממשק, מחוות ותנועה בסגנון Apple
- `find-animation-opportunities` — איתור מקומות שבהם אנימציה יכולה לשפר את הממשק
- `gluestack-ui-v5` — הקמה, רכיבים, styling, variants, ביצועים וולידציה עבור gluestack-ui v5
- `improve` — ביקורת קוד ותכנון שיפורים
- `improve-animations` — ביקורת ותכנון שיפורים למערכת האנימציות
- `neon` — עבודה עם פלטפורמת Neon
- `neon-postgres` — עבודה עם Neon Serverless Postgres
- `review-animations` — ביקורת איכות על אנימציות ותנועה

כדי לעדכן או להשתמש ב־Skills בפרויקטים אחרים, ראו את הוראות ההתקנה במאגר המקור.

## מבנה הפרויקט

```text
src/app/          מסכים, ניווט ונתיבי API של Expo Router
src/components/   רכיבי ממשק משותפים
src/data/         אחסון מקומי ולוגיקת הדומיין
src/db/           סכמת Drizzle וחיבור ל־PostgreSQL
src/widgets/      widgets עבור iOS
drizzle/          מיגרציות מסד הנתונים
scripts/          כלי תחזוקה, גרסאות ויצירת קטלוג
```

## רישיון

הפרויקט מופץ בהתאם לרישיון שבקובץ [LICENSE](./LICENSE).
