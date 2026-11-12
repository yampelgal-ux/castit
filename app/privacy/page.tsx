"use client";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    he: { title: "איזה מידע אנחנו אוספים", body: [
      "פרטי חשבון: שם, שם משתמש, כתובת מייל, סוג החשבון (שחקן/ית או איש/אשת ליהוק).",
      "פרופיל ומאפייני ליהוק שבחרת למלא: גיל משוער, גובה, משקל, צבע עיניים ושיער, שפות, כישורים, מיקום ופרטים דומים.",
      "תמונות וסרטונים שהעלית, טייפים שהגשת לאודישנים, הודעות, תגובות ולייקים.",
      "מידע טכני בסיסי שנדרש להפעלת השירות, כמו סוג הדפדפן ושעת הכניסה.",
    ] },
    en: { title: "What we collect", body: [
      "Account details: name, username, email address, account type (talent or casting professional).",
      "Profile and casting attributes you choose to fill in: playing age, height, weight, eye and hair color, languages, skills, location and similar details.",
      "Photos and videos you upload, tapes you submit to auditions, messages, comments and likes.",
      "Basic technical information needed to run the service, such as browser type and sign-in time.",
    ] },
  },
  {
    he: { title: "מי רואה מה", body: [
      "הפרופיל, התמונות והסרטונים של שחקנים גלויים לכל משתמשי CastIt, כי זו מטרת השירות: שמלהקים ימצאו אותך.",
      "טייפים שהוגשו לאודישן גלויים למלהק שהזמין אותם, ולמי שהוא שולח אליו קישור שיתוף (למשל במאי או מפיק).",
      "הודעות גלויות רק למשתתפי השיחה. כתובת המייל לא מוצגת למשתמשים אחרים.",
      "קבצי מדיה נשמרים בכתובות ארוכות ואקראיות. מי שמקבל את הקישור יכול לצפות בקובץ, לכן אל תשתפו קישורים פרטיים ברבים.",
    ] },
    en: { title: "Who sees what", body: [
      "Talent profiles, photos and videos are visible to all CastIt users, because that's the point of the service: helping casting directors find you.",
      "Audition tapes are visible to the casting director who invited them, and to whoever they send a share link to (for example a director or producer).",
      "Messages are visible only to the people in the conversation. Your email address is not shown to other users.",
      "Media files are stored at long random addresses. Anyone with the link can view the file, so don't post private links publicly.",
    ] },
  },
  {
    he: { title: "איך אנחנו משתמשים במידע", body: [
      "כדי להפעיל את השירות: להציג את הפרופיל, להתאים שחקנים לחיפושים של מלהקים, להעביר הזמנות, הגשות והודעות, ולשלוח תזכורות שביקשת.",
      "כדי לשמור על בטיחות: לטפל בדיווחים, לחסום חשבונות שמפרים את הכללים ולמנוע הונאות.",
      "אנחנו לא מוכרים מידע אישי ולא משתמשים בו לפרסום של גורמים אחרים.",
    ] },
    en: { title: "How we use it", body: [
      "To run the service: show your profile, match talent to casting searches, deliver invites, submissions and messages, and send reminders you asked for.",
      "To keep people safe: handle reports, suspend accounts that break the rules and prevent fraud.",
      "We don't sell personal information or use it for third-party advertising.",
    ] },
  },
  {
    he: { title: "איפה המידע נשמר", body: [
      "המידע נשמר אצל ספקי תשתית ענן: Supabase (מסד נתונים וקבצים, בשרתים באירופה) ו-Vercel (אחסון האתר). חלק מהמידע נשמר גם במכשיר שלך כדי שהאפליקציה תעבוד מהר ובלי חיבור.",
      "כשתופעל העוזרת Aria, טקסטים שתשלחו אליה יעברו לעיבוד אצל Anthropic, ספקית המודל, רק לצורך יצירת התשובה.",
    ] },
    en: { title: "Where it's stored", body: [
      "Data is stored with cloud infrastructure providers: Supabase (database and files, on servers in Europe) and Vercel (website hosting). Some data is also kept on your device so the app works fast and offline.",
      "When the Aria assistant is enabled, text you send to it is processed by Anthropic, the model provider, only to produce the reply.",
    ] },
  },
  {
    he: { title: "הזכויות שלך", body: [
      "אפשר לעיין במידע שלך ולתקן אותו בכל רגע במסך ההגדרות והפרופיל.",
      "אפשר למחוק סרטונים בודדים, ואפשר למחוק את כל החשבון דרך הגדרות ← חשבון ← מחיקת החשבון. המחיקה מסירה את הפרופיל, הקבצים, ההודעות, הלייקים והתגובות. דיווחים שהגשת נשמרים בלי שיוך אליך, לצורכי בטיחות.",
      "לפי חוק הגנת הפרטיות אפשר גם לבקש לעיין במידע שנשמר עליך או למחוק אותו. אפשר לפנות אלינו דרך כפתור הדיווח באפליקציה.",
    ] },
    en: { title: "Your rights", body: [
      "You can view and correct your information at any time in Settings and on your profile.",
      "You can delete individual videos, or your whole account from Settings → Account → Delete account. Deleting removes your profile, files, messages, likes and comments. Reports you filed are kept without your name, for safety purposes.",
      "Under the Israeli Privacy Protection Law you may also ask to review or delete the information stored about you. Reach us through the report button in the app.",
    ] },
  },
  {
    he: { title: "קטינים", body: [
      "משתמשים מתחת לגיל 18 משתמשים בשירות באישור הורה או אפוטרופוס. אם הגעת למסקנה שקטין/ה משתמש/ת בשירות בלי אישור, או שמישהו פונה לקטין/ה באופן לא הולם, דווחו לנו מיד.",
    ] },
    en: { title: "Minors", body: [
      "Users under 18 use the service with a parent's or guardian's consent. If you believe a minor is using the service without consent, or that someone is approaching a minor inappropriately, report it to us right away.",
    ] },
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title={{ he: "מדיניות פרטיות", en: "Privacy policy" }}
      intro={{
        he: "המדיניות הזו מסבירה איזה מידע CastIt שומרת, מי רואה אותו, ומה אפשר לעשות איתו. כתבנו אותה בשפה פשוטה.",
        en: "This policy explains what information CastIt keeps, who sees it, and what you can do about it. We wrote it in plain language.",
      }}
      sections={SECTIONS}
    />
  );
}
