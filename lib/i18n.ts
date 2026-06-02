"use client";
import { create } from "zustand";
import { useEffect, useState } from "react";

// ─── Lightweight i18n ──────────────────────────────────
// Document stays LTR (the UI was built LTR-first with physical CSS props).
// Hebrew text renders correctly via the browser's bidi algorithm + dir="auto"
// on text containers. The toggle swaps copy, not layout — keeps every screen
// visually stable in both languages.

export type Lang = "he" | "en";

const KEY = "castit_lang_v1";

type LangState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
};

function initialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(KEY);
  return stored === "he" || stored === "en" ? stored : "en";
}

export const useLangStore = create<LangState>((set, get) => ({
  lang: "en",
  setLang: (l) => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, l);
    set({ lang: l });
  },
  toggle: () => {
    const next: Lang = get().lang === "he" ? "en" : "he";
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, next);
    set({ lang: next });
  },
}));

// Hydrate from localStorage on first client mount (avoids SSR mismatch)
export function useHydrateLang() {
  const setLang = useLangStore((s) => s.setLang);
  useEffect(() => {
    const l = initialLang();
    setLang(l);
    // Reflect on <html> for a11y + screen readers (lang only, not dir)
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, [setLang]);
}

// ─── Dictionary ────────────────────────────────────────
// Keys are dot-namespaced. Add new strings here — both languages required.
type Entry = { en: string; he: string };

const DICT: Record<string, Entry> = {
  // Navigation (talent)
  "nav.feed":          { en: "Feed",       he: "פיד" },
  "nav.discover":      { en: "Discover",   he: "גילוי" },
  "nav.auditions":     { en: "Auditions",  he: "אודישנים" },
  "nav.messages":      { en: "Messages",   he: "הודעות" },
  "nav.profile":       { en: "Profile",    he: "פרופיל" },
  // Navigation (pro)
  "nav.studio":        { en: "Studio",     he: "סטודיו" },
  "nav.projects":      { en: "Projects",   he: "פרויקטים" },
  "nav.search":        { en: "Search",     he: "חיפוש" },
  "nav.reels":         { en: "Reels",      he: "רילים" },

  // Welcome
  "welcome.eyebrow":   { en: "Built for the next generation of talent", he: "נבנה לדור הבא של הכישרונות" },
  "welcome.tagline1":  { en: "Where talent meets", he: "המקום שבו כישרון פוגש" },
  "welcome.tagline2":  { en: "opportunity", he: "הזדמנות" },
  "welcome.sub":       { en: "The casting platform actors, models and creators have been waiting for. Get discovered by the people who matter.", he: "פלטפורמת הליהוק ששחקנים, דוגמנים ויוצרים חיכו לה. תתגלו על ידי האנשים שחשובים." },
  "welcome.joined":    { en: "talents joined this season", he: "כישרונות הצטרפו העונה" },
  "welcome.getStarted":{ en: "Get Started", he: "בוא נתחיל" },
  "welcome.haveAccount": { en: "I already have an account", he: "כבר יש לי חשבון" },
  "welcome.proLine1":  { en: "I'm a casting professional", he: "אני איש ליהוק מקצועי" },

  // Common actions
  "common.next":       { en: "Next",     he: "הבא" },
  "common.back":       { en: "Back",     he: "חזור" },
  "common.skip":       { en: "Skip",     he: "דלג" },
  "common.save":       { en: "Save",     he: "שמור" },
  "common.cancel":     { en: "Cancel",   he: "ביטול" },
  "common.done":       { en: "Done",     he: "סיום" },
  "common.send":       { en: "Send",     he: "שלח" },
  "common.upload":     { en: "Upload",   he: "העלאה" },
  "common.continue":   { en: "Continue", he: "המשך" },
  "common.markAllRead":{ en: "Mark all read", he: "סמן הכל כנקרא" },

  // Notifications
  "notif.title":       { en: "Notifications", he: "התראות" },
  "notif.empty":       { en: "No notifications", he: "אין התראות" },
  "notif.emptyDesc":   { en: "When a pro invites you, sends a callback, or something important happens — you'll see it here.", he: "כשמלהק יזמין אותך, ישלח callback, או יקרה משהו חשוב — תקבל כאן עדכון." },

  // Language toggle
  "lang.label":        { en: "Language", he: "שפה" },
  "lang.he":           { en: "עברית", he: "עברית" },
  "lang.en":           { en: "English", he: "English" },

  // Onboarding
  "ob.step":           { en: "Step {n} of 3", he: "שלב {n} מתוך 3" },
  "ob.role.title":     { en: "Who are you on", he: "מי אתה ב־" },
  "ob.role.sub":       { en: "Pick the one that fits today — you can switch later.", he: "בחר את מה שמתאים היום — אפשר להחליף בהמשך." },
  "ob.role.talent":    { en: "Talent", he: "כישרון" },
  "ob.role.talentDesc":{ en: "Actor, model, creator. Post reels, get cast.", he: "שחקן, דוגמן, יוצר. פרסם רילים, היבחר לתפקידים." },
  "ob.role.pro":       { en: "Casting Pro", he: "איש ליהוק" },
  "ob.role.proDesc":   { en: "Director, agent, producer. Discover talent.", he: "במאי, סוכן, מפיק. גלה כישרונות." },
  "ob.goals.title":    { en: "What are you here for?", he: "מה הביא אותך לכאן?" },
  "ob.goals.sub":      { en: "Pick any — we'll tailor your feed.", he: "בחר כמה שתרצה — נתאים לך את הפיד." },
  "ob.goal.discovered":{ en: "Get discovered", he: "להתגלות" },
  "ob.goal.discoveredDesc": { en: "Show your reels to casting pros", he: "הצג את הרילים שלך למלהקים" },
  "ob.goal.scenes":    { en: "Practice scenes", he: "לתרגל סצנות" },
  "ob.goal.scenesDesc":{ en: "Sharpen your craft daily", he: "חדד את המשחק שלך יום-יום" },
  "ob.goal.castings":  { en: "Apply to roles", he: "להגיש לתפקידים" },
  "ob.goal.castingsDesc": { en: "Match with paid opportunities", he: "התאמה להזדמנויות בתשלום" },
  "ob.goal.network":   { en: "Build a network", he: "לבנות רשת קשרים" },
  "ob.goal.networkDesc": { en: "Connect with other creatives", he: "התחבר ליוצרים אחרים" },
  "ob.photo.title":    { en: "Add a face to the name", he: "תוסיף פנים לשם" },
  "ob.photo.sub":      { en: "A profile photo boosts your discovery rate 5×.", he: "תמונת פרופיל מגבירה את סיכויי הגילוי שלך פי 5." },
  "ob.photo.tap":      { en: "Tap to upload", he: "הקש להעלאה" },
  "ob.photo.change":   { en: "Change photo", he: "החלף תמונה" },
  "ob.photo.add":      { en: "Add a profile photo", he: "הוסף תמונת פרופיל" },
  "ob.photo.later":    { en: "You can skip this and add a photo later from your profile settings.", he: "אפשר לדלג ולהוסיף תמונה מאוחר יותר מהגדרות הפרופיל." },
  "ob.enter":          { en: "Enter CastIt", he: "כניסה ל-CastIt" },
  "ob.skipNow":        { en: "Skip for now", he: "דלג לבינתיים" },

  // PhotoPicker (shared — appears on onboarding, typecast, etc.)
  "picker.title":      { en: "Choose a source", he: "בחר מקור תמונה" },
  "picker.camera":     { en: "Camera", he: "מצלמה" },
  "picker.cameraSub":  { en: "Take one now", he: "צילום ישיר עכשיו" },
  "picker.gallery":    { en: "Gallery / Files", he: "גלריה / קבצים" },
  "picker.gallerySub": { en: "An existing photo", he: "תמונה שכבר קיימת" },

  // Aria FAB (shared — appears across talent screens)
  "fab.quickActions":  { en: "Quick actions", he: "פעולות מהירות" },
  "fab.heading":       { en: "What does your agent need?", he: "מה הסוכן שלך צריך?" },
  "fab.credits":       { en: "Aria credits remaining", he: "קרדיטים של Aria נותרו" },
  "fab.topUp":         { en: "Top up", he: "טען" },
  "fab.chat":          { en: "Chat with Aria", he: "שיחה עם Aria" },
  "fab.chatSub":       { en: "Casting strategy · negotiations · scheduling", he: "אסטרטגיית ליהוק · משא ומתן · יומן" },
  "fab.practice":      { en: "Practice with Aria", he: "תרגל עם Aria" },
  "fab.practiceSub":   { en: "Upload sides (image / text / file) and rehearse", he: "העלה sides (תמונה / טקסט / קובץ) ותרגל" },
  "fab.studio":        { en: "Open Studio", he: "פתח סטודיו" },
  "fab.studioSub":     { en: "Scene library · reel upload", he: "ספריית סצנות · העלאת ריל" },

  // Upload sources (reels + auditions)
  "up.camera":         { en: "Camera", he: "מצלמה" },
  "up.phoneCamera":    { en: "Phone camera", he: "מצלמת טלפון" },
  "up.galleryFiles":   { en: "Gallery / file", he: "גלריה / קובץ" },
  "up.recordStudio":   { en: "Record in studio", he: "הקלטה בסטודיו" },

  // Pro Dashboard
  "pd.studio":         { en: "Studio", he: "סטודיו" },
  "pd.greeting":       { en: "Good to see you,", he: "טוב לראות אותך," },
  "pd.greetingFallback": { en: "there", he: "" },
  "pd.workspace":      { en: "Your casting workspace.", he: "סביבת העבודה שלך." },
  "pd.actionInbox":    { en: "Action Inbox", he: "תיבת פעולות" },
  "pd.urgentActions":  { en: "{n} urgent actions", he: "{n} פעולות דחופות" },
  "pd.itemsWaiting":   { en: "{n} items waiting", he: "{n} פריטים ממתינים" },
  "pd.tapesToReviewShort": { en: "{n} tapes to review · ", he: "{n} טייפים לסקירה · " },
  "pd.tapOpen":        { en: "Tap to open", he: "הקש לפתיחה" },
  "pd.triage":         { en: "Tape Triage Mode", he: "מצב סקירת טייפים" },
  "pd.triageSub":      { en: "Swipe right/left to fly through {n} tapes", he: "החלק ימינה/שמאלה כדי לעבור מהר על {n} טייפים" },
  "pd.kpi.projects":   { en: "Active projects", he: "פרויקטים פעילים" },
  "pd.kpi.toReview":   { en: "Tapes to review", he: "טייפים לסקירה" },
  "pd.kpi.invites":    { en: "Open invites", he: "הזמנות פתוחות" },
  "pd.kpi.booked":     { en: "Booked", he: "אושרו" },
  "pd.qa.find":        { en: "Find", he: "חיפוש" },
  "pd.qa.reviews":     { en: "Reviews", he: "סקירות" },
  "pd.qa.analytics":   { en: "Analytics", he: "נתונים" },
  "pd.qa.inbox":       { en: "Inbox", he: "התראות" },
  "pd.workspaceTag":   { en: "Workspace", he: "סביבת עבודה" },
  "pd.projectsTitle":  { en: "Projects & Auditions", he: "פרויקטים ואודישנים" },
  "pd.projectsSub":    { en: "Organize tapes by project and role — decide callbacks.", he: "ארגן טייפים לפי פרויקט ותפקיד — החלט על callbacks." },
  "pd.awaiting":       { en: "Awaiting your call", he: "ממתין להחלטתך" },
  "pd.seeAll":         { en: "See all →", he: "הצג הכל →" },
  "pd.review":         { en: "Review", he: "סקירה" },
  "pd.empty.title":    { en: "Start your first project", he: "התחל את הפרויקט הראשון" },
  "pd.empty.sub":      { en: "Create a casting folder, add roles, then send audition invites to talents you find via search or reels.", he: "צור תיקיית ליהוק, הוסף תפקידים, ושלח הזמנות לאודישן לכישרונות שתמצא בחיפוש או ברילים." },
  "pd.empty.cta":      { en: "Create project", he: "צור פרויקט" },
  "time.ago.d":        { en: "{n}d ago", he: "לפני {n} ימים" },
  "time.ago.h":        { en: "{n}h ago", he: "לפני {n} שעות" },
  "time.now":          { en: "just now", he: "הרגע" },

  // Feed
  "feed.following":    { en: "Following", he: "עוקב" },
  "feed.forYou":       { en: "For You", he: "בשבילך" },
  "feed.follow":       { en: "Follow", he: "עקוב" },
  "feed.save":         { en: "Save", he: "שמור" },
  "feed.saved":        { en: "Saved", he: "נשמר" },
  "feed.send":         { en: "Send", he: "שלח" },
  "feed.sendToPro":    { en: "Send to a Casting Pro", he: "שלח למלהק" },
  "feed.originalAudio":{ en: "Original audio", he: "אודיו מקורי" },
  "feed.eyes":         { en: "Eyes", he: "עיניים" },
  "feed.hair":         { en: "hair", he: "שיער" },

  // Discover
  "disc.title":        { en: "Discover", he: "גילוי" },
  "disc.search":       { en: "Search talent, skills, location…", he: "חפש כישרון, כישורים, מיקום…" },
  "disc.filters":      { en: "Filters", he: "מסננים" },
  "disc.results":      { en: "results", he: "תוצאות" },
  "disc.talents":      { en: "talents", he: "כישרונות" },
  "disc.searchPh":     { en: "Search talents", he: "חפש כישרונות" },
  "disc.noResults":    { en: "No talent matches these filters", he: "אין כישרון שתואם למסננים האלה" },
  "disc.clearFilters": { en: "Clear filters", he: "נקה מסננים" },
  "disc.sortedBy":     { en: "Sorted by Typecast match.", he: "ממוין לפי התאמת Typecast." },
  "disc.showingFit":   { en: "Showing talents with ≥40% fit.", he: "מציג כישרונות עם התאמה ≥40%." },

  // Tape Triage
  "tri.title":         { en: "Tape Triage", he: "סקירת טייפים" },
  "tri.titleCount":    { en: "Triage {a}/{b}", he: "סקירה {a}/{b}" },
  "tri.undo":          { en: "Undo", he: "בטל" },
  "tri.empty":         { en: "No tapes to review", he: "אין טייפים לסקירה" },
  "tri.emptyDesc":     { en: "When talents send new tapes, they show up here for quick review.", he: "כשטאלנטים ישלחו טייפים חדשים, הם יופיעו כאן לסקירה מהירה." },
  "tri.backDash":      { en: "Back to dashboard", he: "חזור לדשבורד" },
  "tri.done":          { en: "All done!", he: "סיימת!" },
  "tri.reviewed":      { en: "You reviewed {n} tapes.", he: "סקרת {n} טייפים." },
  "tri.callback":      { en: "Callback", he: "Callback" },
  "tri.hold":          { en: "Hold", he: "Hold" },
  "tri.pass":          { en: "Pass", he: "Pass" },
  "tri.dashboard":     { en: "Dashboard", he: "דשבורד" },
  "tri.actionInbox":   { en: "Action Inbox", he: "תיבת פעולות" },
  "tri.noTape":        { en: "No tape", he: "אין טייפ" },
  "tri.round":         { en: "ROUND {n}", he: "סבב {n}" },

  // Analytics
  "an.title":          { en: "Analytics", he: "נתונים" },
  "an.empty":          { en: "Not enough data yet", he: "עדיין אין מספיק נתונים" },
  "an.emptyDesc":      { en: "Once you start receiving submissions to your projects, analytics will appear here.", he: "ברגע שתתחיל לקבל הגשות לפרויקטים שלך, האנליטיקה תופיע כאן." },
  "an.kpi.subs":       { en: "Submissions", he: "הגשות" },
  "an.kpi.reviewed":   { en: "Tapes Reviewed", he: "טייפים שנסקרו" },
  "an.kpi.callbacks":  { en: "Callbacks", he: "Callbacks" },
  "an.kpi.booked":     { en: "Booked", he: "אושרו" },
  "an.ariaImpact":     { en: "Aria Impact", he: "השפעת Aria" },
  "an.hoursSaved":     { en: "hours saved so far", he: "שעות נחסכו עד עכשיו" },
  "an.ariaEstimate":   { en: "Estimated from {n} tapes analyzed, auto-drafted messages, and bulk role creation.", he: "הערכה לפי {n} טייפים שעברו ניתוח, ניסוחי הודעות אוטומטיים, ויצירת תפקידים ב-bulk." },
  "an.funnel":         { en: "Pipeline Conversion", he: "המרת Pipeline" },
  "an.funnelSub":      { en: "How submissions advance through stages", he: "כמה מההגשות מתקדמות בכל שלב" },
  "an.bookRate":       { en: "Book Rate", he: "אחוז אישור" },
  "an.callbackRate":   { en: "Callback Rate", he: "אחוז Callback" },
  "an.ttd":            { en: "Time-to-Decision", he: "זמן להחלטה" },
  "an.days":           { en: "days", he: "ימים" },
  "an.ttdSub":         { en: "Average from invitation to final decision", he: "ממוצע מהזמנה ועד החלטה סופית" },
  "an.topProjects":    { en: "Top Projects", he: "פרויקטים מובילים" },
  "an.subsBooked":     { en: "{a} submissions · {b} booked", he: "{a} הגשות · {b} אושרו" },
  "an.directorVotes":  { en: "Director Votes", he: "הצבעות במאים" },
  "an.votesCount":     { en: "{n} votes from directors", he: "{n} הצבעות מבמאים" },
  "an.yes":            { en: "Yes", he: "כן" },
  "an.maybe":          { en: "Maybe", he: "אולי" },
  "an.no":             { en: "No", he: "לא" },

  // Projects — casting mode picker
  "proj.fullDesc":     { en: "Full 8-stage pipeline. Leads, support, day-players — with callback/hold/avail/offer.", he: "Pipeline מלא 8 שלבים. לידים, סופורט, יומיים — עם callback/hold/avail/offer." },
  "proj.quickDesc":    { en: "Just 3 stages. For extras, models, commercials — Select/Pass.", he: "3 שלבים בלבד. לניצבים, דוגמנים, פרסומות — Select/Pass." },
  "proj.sidesFileLabel": { en: "Sides file (optional)", he: "קובץ Sides (אופציונלי)" },
  "proj.sidesFileHint":  { en: "PDF / DOC / TXT the talents can download", he: "קובץ PDF / DOC / TXT שהשחקנים יוכלו להוריד" },

  // Approvals (Director Reviews)
  "ap.new":            { en: "New", he: "חדש" },
  "ap.back":           { en: "Back", he: "חזור" },
  "ap.empty":          { en: "No review sessions yet", he: "עדיין אין סשני אישור" },
  "ap.emptyDesc":      { en: 'After reviewing tapes, create a "Director Review" — pick a few tapes and send a link to the director. They vote 👍/🤔/👎 on each, and it syncs back to you.', he: 'לאחר שאתה מסקור טייפים, צור "Director Review" — בחר 5 טייפים ושלח קישור לבמאי. הוא מצביע 👍/🤔/👎 על כל אחד, וההצבעה מסתנכרנת אליך.' },
  "ap.createFirst":    { en: "Create first session", he: "צור סשן ראשון" },
  "ap.copied":         { en: "Copied", he: "הועתק" },
  "ap.copyLink":       { en: "Copy link", he: "העתק קישור" },
  "ap.open":           { en: "Open", he: "פתח" },
  "ap.noProjects":     { en: "No projects. Create one first.", he: "אין פרויקטים. צור פרויקט קודם." },
  "ap.roleOptional":   { en: "Role (optional)", he: "תפקיד (אופציונלי)" },
  "ap.noTapesYet":     { en: "No tapes in this role yet.", he: "אין טייפים עדיין בתפקיד הזה." },
  "ap.greetingOptional": { en: "Greeting (optional)", he: "ברכה (אופציונלי)" },
  "ap.createLink":     { en: "Create director link", he: "צור קישור לבמאי" },
  "ap.deleteConfirm":  { en: 'Delete session "{title}"?', he: 'למחוק סשן "{title}"?' },
};

// The translation hook. Returns { t, lang, dir }.
// t(key, params?) — params fills {placeholders}, e.g. t("ob.step", { n: 2 }).
export function useT() {
  const lang = useLangStore((s) => s.lang);
  function t(key: string, params?: Record<string, string | number>): string {
    const entry = DICT[key];
    let str = entry ? (entry[lang] ?? entry.en) : key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  }
  return { t, lang, dir: (lang === "he" ? "rtl" : "ltr") as "rtl" | "ltr" };
}

// Non-hook accessor for places outside React render (rare)
export function translate(key: string, lang: Lang): string {
  return DICT[key]?.[lang] ?? key;
}
