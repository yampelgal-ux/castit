# CastIt — מהדמו לאפליקציה אמיתית

הענף הזה הופך את CastIt מדמו שרץ בדפדפן לאפליקציה אמיתית:
חשבונות אמיתיים, נתונים בענן, סנכרון בין מכשירים, שיתוף אמיתי בין מלהק לשחקן,
אפליקציה שמתקינים בטלפון — ובסיס מוכן לחנויות האפליקציות (iOS / Android).

---

## מה השתנה

### 1. Backend אמיתי (Supabase)
| לפני | אחרי |
|---|---|
| פרויקטים, תפקידים, הגשות, התראות, הערות, יומן — רק ב-localStorage של הדפדפן | כל הנתונים נשמרים בחשבון בענן ומסונכרנים לכל מכשיר שמתחברים ממנו |
| ריענון הדף = התנתקות | נשארים מחוברים (גם אחרי סגירת האפליקציה) |
| מלהק "מזמין" שחקן — אבל השחקן לא מקבל כלום | ההזמנה מגיעה לחשבון של השחקן, הטייפ חוזר למלהק, Callback / Offer / Booked מגיעים לשחקן עם התראה |
| לינק שיתוף / לינק אישור לבמאי עובד רק במחשב שיצר אותו | הלינק נפתח בכל מכשיר בלי חשבון, ההצבעות של הבמאי חוזרות למלהק בזמן אמת |
| טייפים וקבצי סיידס רק במכשיר שהקליט | עולים ל-Supabase Storage — המלהק והבמאי צופים מכל מקום |
| Pro Search מציג רק שחקני דמו | שחקנים שנרשמו באמת מופיעים בחיפוש עם ה-Typecast שלהם |
| אין התחברות לשחקנים, אין שכחתי סיסמה, אין התנתקות | `/login` לכולם, איפוס סיסמה במייל, תפריט חשבון (⚙) עם התנתקות |

**מצב דמו נשמר:** אורח שלא נרשם עדיין מקבל את נתוני הדמו כמו קודם — אבל הם לעולם לא נכנסים לחשבון אמיתי.

### 2. אפליקציה שמתקינים (PWA)
- אייקון אמיתי, מסך מלא בלי "מסגרת טלפון", התאמה ל-notch.
- עובד גם בלי אינטרנט: מסכים שנפתחו זמינים אופליין, שינויים נשמרים ומסונכרנים כשהרשת חוזרת.
- כפתור "התקן את CastIt כאפליקציה" בתפריט החשבון (באייפון: שיתוף ← הוסף למסך הבית).

### 3. אפליקציות לחנויות (Capacitor)
- תיקיות `android/` ו-`ios/` מוכנות, עם הרשאות מצלמה + מיקרופון לטייפים, אייקונים ומסך פתיחה.
- האפליקציה הנייטיבית טוענת את האתר החי (`https://castit.vercel.app`) — כל עדכון שעולה ל-Vercel מגיע מיד גם לאפליקציה בלי לעבור שוב אישור חנות.

---

## הפעלה — 3 צעדים (פעם אחת)

### צעד 1: להריץ את המיגרציה ב-Supabase
1. [supabase.com/dashboard](https://supabase.com/dashboard) ← הפרויקט ← **SQL Editor** ← New query
2. אם עוד לא הרצת את `supabase-schema.sql` — להריץ אותו קודם.
3. להדביק את כל התוכן של `supabase/migrations/002_real_app.sql` ← **Run**. (בטוח להריץ שוב.)

### צעד 2: הגדרות Auth ב-Supabase
**Authentication → URL Configuration**
- Site URL: `https://castit.vercel.app`
- Redirect URLs: להוסיף `https://castit.vercel.app/**` ו-`http://localhost:3000/**`

(אפשר לכבות "Confirm email" תחת Authentication → Providers → Email אם רוצים הרשמה בלי אימות מייל בזמן בדיקות.)

### צעד 3: משתני סביבה ב-Vercel
Vercel ← castit ← Settings ← Environment Variables — לוודא שקיימים:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
```
ואז Deploy מחדש.

---

## לבנות אפליקציה לחנויות

**Android** (צריך Android Studio):
```bash
npm install
npm run cap:android      # מסנכרן ופותח ב-Android Studio → Build → Generate Signed Bundle
```

**iOS** (צריך Mac + Xcode + חשבון Apple Developer):
```bash
npm install
npm run cap:ios          # מסנכרן ופותח ב-Xcode → Signing → Product → Archive
```

דומיין אחר / סביבת בדיקות: `CASTIT_APP_URL=https://your-domain npx cap sync`

---

## איך זה בנוי (למפתחים)

| קובץ | תפקיד |
|---|---|
| `lib/cloud/sync.ts` | מנוע סנכרון: כל מפתח `castit_*` ב-localStorage משתקף לטבלת `user_kv` (push עם debounce, pull בהתחברות, realtime, הגנה על שינויים שעוד לא עלו) |
| `lib/cloud/shared.ts` | נתונים בין חשבונות (`shared_records`): הזמנות אודישן מלהק↔שחקן, לינקי שיתוף/אישור ציבוריים, הצבעות במאי |
| `lib/cloud/talents.ts`, `profile.ts` | פרסום כרטיס השחקן וטעינת שחקנים אמיתיים ל-Pro Search |
| `lib/cloud/media.ts` | טייפים / סיידס / תמונות פרופיל ב-Supabase Storage (bucket `media`) |
| `lib/cloud/auth.ts`, `components/LoginForm.tsx` | התחברות, הרשמה, איפוס סיסמה, התנתקות |
| `components/CloudSync.tsx` | מחזור החיים של החשבון + באנר "עדכונים חדשים" / "אופליין" |
| `public/sw.js`, `app/manifest.ts`, `app/offline` | PWA |
| `capacitor.config.ts`, `android/`, `ios/`, `native-shell/` | אפליקציות נייטיב |
| `supabase/migrations/002_real_app.sql` | טבלאות, RLS, פונקציות RPC, Storage, Realtime |

**אבטחה:** כל טבלה מוגנת ב-Row Level Security — משתמש רואה רק את הנתונים שלו; הזמנה משותפת נראית רק למלהק ולשחקן שלה; לינקים ציבוריים נפתחים רק לפי ה-slug (אי אפשר לרשום את כולם); חבר בהזמנה לא יכול להשתלט עליה או למחוק אותה.
קבצי מדיה נשמרים ב-bucket ציבורי עם מפתחות אקראיים ארוכים (כמו לינק "לא רשום") — כדי שבמאי יוכל לצפות בטייפ בלי חשבון.

## מה עדיין כדאי להוסיף בהמשך
- Push notifications לטלפון (כרגע ההתראות בתוך האפליקציה + realtime).
- העלאת טייפים גדולים ברקע עם המשך אחרי ניתוק (כרגע ההעלאה מתחילה מיד בסיום ההקלטה).
- דף מדיניות פרטיות ותנאי שימוש — נדרשים לפרסום בחנויות.
