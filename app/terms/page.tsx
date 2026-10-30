"use client";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    he: { title: "מה זה CastIt", body: [
      "CastIt היא פלטפורמה שמחברת בין שחקנים, דוגמנים ואנשי מקצוע מתחום הליהוק. שחקנים מפרסמים פרופיל, תמונות וסרטונים, ומלהקים מחפשים, שומרים ומזמינים אותם לאודישנים.",
      "CastIt לא מעסיקה את השחקנים ולא צד להסכמי עבודה ביניהם לבין מלהקים או מפיקים. כל הסכם כזה הוא בין הצדדים בלבד.",
    ] },
    en: { title: "What CastIt is", body: [
      "CastIt is a platform that connects actors, models and casting professionals. Talent publish a profile, photos and videos; casting professionals search, save and invite them to auditions.",
      "CastIt does not employ talent and is not a party to any work agreement between talent and casting directors or producers. Any such agreement is between those parties only.",
    ] },
  },
  {
    he: { title: "החשבון שלך", body: [
      "צריך למסור פרטים נכונים בהרשמה ולשמור על הסיסמה. אסור להתחזות לאדם אחר, לסוכנות או לחברת הפקה.",
      "משתמשים מתחת לגיל 18 רשאים להשתמש בשירות רק באישור הורה או אפוטרופוס, שאחראי/ת על השימוש שלהם.",
      "אפשר למחוק את החשבון בכל רגע דרך הגדרות ← חשבון ← מחיקת החשבון.",
    ] },
    en: { title: "Your account", body: [
      "Give accurate details when you sign up and keep your password safe. Don't impersonate another person, agency or production company.",
      "Users under 18 may use the service only with the consent of a parent or guardian, who is responsible for their use.",
      "You can delete your account at any time from Settings → Account → Delete account.",
    ] },
  },
  {
    he: { title: "התוכן שלך", body: [
      "התמונות, הסרטונים והטקסטים שאת/ה מעלה נשארים שלך. בהעלאה את/ה נותן/ת ל-CastIt רשות להציג אותם בתוך השירות למשתמשים אחרים, למשל בפיד, בחיפוש ובקישורי שיתוף שמלהקים שולחים לבמאים.",
      "מעלים רק תוכן שיש לך זכות לפרסם. אם מופיעים בו אנשים נוספים, צריך את הסכמתם.",
      "כשמוחקים סרטון או את החשבון, התוכן יורד מהשירות. עותקים שמשתמשים אחרים כבר שמרו או שיתפו מחוץ לשירות אינם בשליטתנו.",
    ] },
    en: { title: "Your content", body: [
      "Photos, videos and text you upload stay yours. By uploading you allow CastIt to show them inside the service to other users, for example in the feed, in search, and in share links casting directors send to directors.",
      "Only upload content you have the right to publish. If other people appear in it, you need their consent.",
      "When you delete a video or your account, the content is removed from the service. Copies other users already saved or shared outside the service are beyond our control.",
    ] },
  },
  {
    he: { title: "מה אסור", body: [
      "הטרדה, איומים, פנייה מינית או לא הולמת, ובמיוחד כלפי קטינים.",
      "בקשת כסף מאחרים כתנאי לאודישן או לתפקיד, הונאות והתחזות.",
      "תוכן פוגעני, גזעני, אלים או מיני, ספאם ופרסום מסחרי שלא קשור לליהוק.",
      "איסוף מידע על משתמשים אחרים או שימוש בו מחוץ למטרת הליהוק.",
      "אפשר לדווח על משתמש, סרטון, תגובה או שיחה, וגם לחסום. אנחנו רשאים להסיר תוכן ולחסום חשבונות שמפרים את הכללים.",
    ] },
    en: { title: "What's not allowed", body: [
      "Harassment, threats, sexual or inappropriate approaches, especially toward minors.",
      "Asking others for money as a condition for an audition or a role, scams and impersonation.",
      "Offensive, racist, violent or sexual content, spam, and commercial promotion unrelated to casting.",
      "Collecting information about other users or using it outside the purpose of casting.",
      "You can report a user, video, comment or conversation, and block people. We may remove content and suspend accounts that break these rules.",
    ] },
  },
  {
    he: { title: "אחריות", body: [
      "השירות ניתן כמו שהוא. אנחנו עושים מאמץ שיפעל בלי תקלות, אבל לא מתחייבים לזמינות מלאה או לכך שאודישן או תפקיד יתקבלו דרכו.",
      "אנחנו לא בודקים כל משתמש. לפני פגישה פיזית או שיתוף פרטים אישיים, כדאי לוודא שמדובר באיש מקצוע אמיתי. לעולם אל תשלמו כדי לקבל אודישן.",
    ] },
    en: { title: "Liability", body: [
      "The service is provided as is. We work to keep it running, but we don't guarantee full availability or that any audition or role will come through it.",
      "We don't vet every user. Before meeting in person or sharing personal details, make sure you're dealing with a real professional. Never pay to get an audition.",
    ] },
  },
  {
    he: { title: "שינויים ויצירת קשר", body: [
      "אם נשנה את התנאים נעדכן את התאריך בראש הדף, ובשינוי מהותי נודיע באפליקציה.",
      "על התנאים חל הדין הישראלי. לשאלות ולבקשות אפשר לפנות אלינו דרך כפתור הדיווח באפליקציה.",
    ] },
    en: { title: "Changes and contact", body: [
      "If we change these terms we'll update the date at the top, and announce significant changes in the app.",
      "These terms are governed by Israeli law. For questions and requests, reach us through the report button in the app.",
    ] },
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title={{ he: "תנאי שימוש", en: "Terms of use" }}
      intro={{
        he: "ברוכים הבאים ל-CastIt. השימוש באפליקציה ובאתר כפוף לתנאים האלה. ההרשמה והשימוש מהווים הסכמה להם.",
        en: "Welcome to CastIt. Using the app and website is subject to these terms. Signing up and using the service means you agree to them.",
      }}
      sections={SECTIONS}
    />
  );
}
