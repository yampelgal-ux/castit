"use client";
import { create } from "zustand";
import { useEffect, useState } from "react";

// ─── Lightweight i18n ──────────────────────────────────
// When Hebrew is active, the document switches to dir="rtl" so the entire
// layout mirrors. Physical CSS props (ml-/mr-, left/right) still resolve as
// written — most of those will visually flip because their container flips,
// but a handful (back chevrons, icon-side affordances) may need per-component
// adjustments based on `dir` from useT().

export type Lang = "he" | "en";

const KEY = "castit_lang_v1";

type LangState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
};

function initialLang(): Lang {
  if (typeof window === "undefined") return "he";
  const stored = window.localStorage.getItem(KEY);
  return stored === "he" || stored === "en" ? stored : "he";
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
  const lang = useLangStore((s) => s.lang);
  useEffect(() => {
    const l = initialLang();
    setLang(l);
  }, [setLang]);
  // Reflect lang + dir on <html> whenever language changes.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);
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
  "welcome.proof":     { en: "Casting directors, actors & agencies — one platform.", he: "מלהקים, שחקנים וסוכנויות — פלטפורמה אחת." },
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
  "an.thisSeason":     { en: "This season", he: "העונה" },
  "an.heroBookRate":   { en: "callback rate", he: "אחוז callback" },
  "an.heroSubs":       { en: "submissions", he: "הגשות" },
  "an.heroHours":      { en: "hours saved", he: "שעות נחסכו" },
  "an.dropoff":        { en: "{n}% drop-off", he: "{n}% נשירה" },
  "an.ofSubs":         { en: "of submissions", he: "מההגשות" },

  // Messages
  "msg.title":         { en: "Messages", he: "הודעות" },
  "msg.empty":         { en: "No conversations yet", he: "עדיין אין שיחות" },
  "msg.emptyDesc":     { en: "Message a talent from their profile or a reel — chats appear here.", he: "שלח הודעה לטאלנט מהפרופיל או מריל — השיחות יופיעו כאן." },
  "msg.placeholder":   { en: "Write a message…", he: "כתוב הודעה…" },
  "msg.searchPh":      { en: "Search messages", he: "חפש בהודעות" },

  // Self-tape record
  "rec.studio":        { en: "Self-tape studio", he: "אולפן Self-tape" },
  "rec.cameraOff":     { en: "Camera unavailable", he: "המצלמה לא זמינה" },
  "rec.cameraOffDesc": { en: "Open the app over HTTPS and allow camera + microphone — or upload an existing file below.", he: "פתח את האפליקציה ב-HTTPS ואשר מצלמה + מיקרופון — או העלה קובץ קיים למטה." },
  "rec.shootWith":     { en: "Shot on a pro camera / studio? Choose \"Gallery / files\".", he: "צילמת במצלמה מקצועית / סטודיו? בחר \"גלריה / קבצים\"." },
  "rec.phoneCam":      { en: "Record with phone camera", he: "צלם עם מצלמת הטלפון" },
  "rec.pickGallery":   { en: "Pick from gallery / files", he: "בחר מהגלריה / קבצים" },
  "rec.loading":       { en: "Loading…", he: "טוען…" },
  "rec.saving":        { en: "Saving…", he: "שומר…" },
  "rec.phoneCamShort": { en: "Phone camera", he: "מצלמת טלפון" },
  "rec.galleryShort":  { en: "Gallery / file", he: "גלריה / קובץ" },
  "rec.errVideoOnly":  { en: "Video files only (MP4, MOV, WEBM, etc.)", he: "רק קבצי וידאו (MP4, MOV, WEBM וכו')" },
  "rec.errTooBig":     { en: "File too large (max 500MB). Try a compressed MP4.", he: "הקובץ גדול מדי (מקסימום 500MB). נסה להמיר ל-MP4 דחוס." },
  "rec.practiceAria":  { en: "Practice the scene with Aria", he: "תרגל את הסצנה עם Aria" },
  "rec.ariaPreparing": { en: "Aria is preparing notes…", he: "Aria מכינה הוראות…" },
  "rec.show":          { en: "Show", he: "הצג" },
  "rec.hide":          { en: "Hide", he: "סגור" },
  "rec.ariaDirections":{ en: "Aria's direction", he: "הוראות בימוי של Aria" },
  "rec.askAria":       { en: "Ask Aria about the role", he: "שאל את Aria על התפקיד" },
  "rec.slate":         { en: "Slate first", he: "סלייט קודם" },
  "rec.headHere":      { en: "Head here", he: "ראש כאן" },
  "rec.sides":         { en: "Sides", he: "Sides" },
  "rec.instructions":  { en: "Instructions", he: "הוראות" },
  "rec.sendTape":      { en: "Send tape", he: "שלח טייפ" },
  "rec.anotherTake":   { en: "Another take", he: "טייק נוסף" },

  // Common empty / robustness
  "empty.notFound":    { en: "Not found", he: "לא נמצא" },
  "empty.removed":     { en: "This may have been removed.", he: "ייתכן שזה הוסר." },

  // Casting Report (public share)
  "report.label":      { en: "Casting Report", he: "דוח ליהוק" },
  "report.talents":    { en: "{n} talents", he: "{n} כישרונות" },
  "report.talent1":    { en: "1 talent", he: "כישרון 1" },
  "report.print":      { en: "Save / Print", he: "שמור / הדפס" },
  "report.notFound":   { en: "Link not found", he: "הקישור לא נמצא" },
  "report.removed":    { en: "This shortlist may have been removed.", he: "ייתכן שה-shortlist הוסר." },
  "report.expired":    { en: "This link has expired", he: "תוקף הקישור פג" },
  "report.expiredDesc":{ en: "Ask the sender for a fresh link.", he: "בקש מהשולח קישור חדש." },
  "report.empty":      { en: "No talents on this shortlist.", he: "אין כישרונות ב-shortlist." },
  "report.note":       { en: "Casting director's note", he: "הערת המלהק/ת" },
  "report.reels":      { en: "Audition reels", he: "רילי אודישן" },
  "report.noReels":    { en: "No reels yet.", he: "אין רילים עדיין." },
  "report.curated":    { en: "Curated on CastIt", he: "נאסף ב-CastIt" },
  "report.presented":  { en: "Presented by", he: "מוצג על ידי" },

  // Pro search
  "srch.title":        { en: "Talent search", he: "חיפוש כישרון" },
  "srch.clearAll":     { en: "Clear all", he: "נקה הכל" },
  "srch.matches":      { en: "matches", he: "התאמות" },
  "srch.noMatches":    { en: "No matches — yet", he: "אין התאמות — עדיין" },
  "srch.refine":       { en: "Refine search", he: "דייק חיפוש" },
  "srch.matchCount":   { en: "{n} talents match these filters", he: "{n} כישרונות תואמים למסננים" },
  "srch.showMatches":  { en: "Show {n} matches", he: "הצג {n} התאמות" },

  // Projects — casting mode picker
  "proj.fullDesc":     { en: "Full 8-stage pipeline. Leads, support, day-players — with callback/hold/avail/offer.", he: "Pipeline מלא 8 שלבים. לידים, סופורט, יומיים — עם callback/hold/avail/offer." },
  "proj.quickDesc":    { en: "Just 3 stages. For extras, models, commercials — Select/Pass.", he: "3 שלבים בלבד. לניצבים, דוגמנים, פרסומות — Select/Pass." },
  "proj.sidesFileLabel": { en: "Sides file (optional)", he: "קובץ Sides (אופציונלי)" },
  "proj.sidesFileHint":  { en: "PDF / DOC / TXT the talents can download", he: "קובץ PDF / DOC / TXT שהשחקנים יוכלו להוריד" },

  // Signup
  "signup.headerTitle":  { en: "Create account", he: "יצירת חשבון" },
  "signup.title":        { en: "Tell us who you are.", he: "ספרי לנו מי את." },
  "signup.sub":          { en: "Two seconds. Then we get to the good part.", he: "שתי שניות. ואז מתחילים לעניין." },
  "signup.role.talent":  { en: "Talent", he: "כישרון" },
  "signup.role.talentSub": { en: "Actor · Model · Creator", he: "שחקן · דוגמן · יוצר" },
  "signup.role.pro":     { en: "Casting Pro", he: "איש ליהוק" },
  "signup.role.proSub":  { en: "Director · Casting · Studio", he: "במאי · ליהוק · סטודיו" },
  "signup.fullName":     { en: "Full name", he: "שם מלא" },
  "signup.email":        { en: "Email", he: "אימייל" },
  "signup.password":     { en: "Password (min 6 chars)", he: "סיסמה (לפחות 6 תווים)" },
  "signup.creating":     { en: "Creating account…", he: "יוצר חשבון…" },
  "signup.continue":     { en: "Continue", he: "המשך" },

  // Verify
  "vfy.headerTitle":     { en: "Get verified", he: "אימות חשבון" },
  "vfy.intro":           { en: "Verification helps casting pros trust your profile.", he: "אימות עוזר למלהקים לסמוך על הפרופיל שלך." },
  "vfy.selfie":          { en: "Selfie", he: "סלפי" },
  "vfy.selfieDesc":      { en: "A clear photo of your face, no filters.", he: "תמונה ברורה של הפנים שלך, ללא פילטרים." },
  "vfy.id":              { en: "Government ID", he: "תעודה מזהה" },
  "vfy.idDesc":          { en: "Driver's license or passport.", he: "רישיון נהיגה או דרכון." },
  "vfy.submit":          { en: "Submit for review", he: "שלח לאישור" },
  "vfy.reviewing":       { en: "Reviewing your details", he: "בודק את הפרטים שלך" },
  "vfy.reviewingSub":    { en: "Usually takes under a minute.", he: "בדרך כלל פחות מדקה." },
  "vfy.done":            { en: "You're verified ✓", he: "החשבון מאומת ✓" },
  "vfy.doneSub":         { en: "Casting pros will see the blue badge on your profile.", he: "מלהקים יראו את התג הכחול בפרופיל שלך." },
  "vfy.buildTypecast":   { en: "Build your Typecast", he: "בנה את ה-Typecast שלך" },

  // Typecast onboarding flow
  "tc.stepOf":           { en: "Step {n} of {total}", he: "שלב {n} מתוך {total}" },
  "tc.idNotice":         { en: "Your typecast is your casting ID — required for verification", he: "ה-Typecast שלך הוא תעודת הליהוק — נדרש לאימות" },
  "tc.photo.addTitle":   { en: "Add a profile photo", he: "הוסף תמונת פרופיל" },
  "tc.photo.label":      { en: "Your profile photo", he: "תמונת הפרופיל שלך" },
  "tc.photo.haveText":   { en: "This is what casting pros will see.", he: "זה מה שמלהקים יראו." },
  "tc.photo.tapText":    { en: "Tap to upload — needed for verification.", he: "הקש להעלאה — נדרש לאימות." },
  "tc.photo.hint":       { en: "Use a clear, recent headshot.", he: "השתמש בתמונת ראש ברורה ועדכנית." },
  "tc.step.physical":    { en: "Physical", he: "פיזי" },
  "tc.step.appearance":  { en: "Appearance", he: "מראה" },
  "tc.step.skills":      { en: "Skills", he: "כישורים" },
  "tc.step.range":       { en: "Range", he: "טווח" },
  "tc.h.physical":       { en: "The physical basics.", he: "המאפיינים הפיזיים." },
  "tc.h.appearance":     { en: "Your look.", he: "המראה שלך." },
  "tc.h.skills":         { en: "Your craft.", he: "האומנות שלך." },
  "tc.h.range":          { en: "Your range.", he: "הטווח שלך." },
  "tc.sub.physical":     { en: "Casting pros filter by these exact stats.", he: "מלהקים מסננים לפי הנתונים האלה." },
  "tc.sub.appearance":   { en: "Pick what's closest. Real reference visuals — not flat colors.", he: "בחר את הקרוב ביותר. דוגמאות חזותיות אמיתיות — לא צבעים שטוחים." },
  "tc.sub.skills":       { en: "Be honest — it's what makes you castable.", he: "תהיה כן — זה מה שהופך אותך לבר-ליהוק." },
  "tc.sub.range":        { en: "Tell us what you can play and love to do.", he: "ספר לנו מה אתה יודע לשחק ומה אתה אוהב." },
  "tc.height":           { en: "Height", he: "גובה" },
  "tc.weight":           { en: "Weight", he: "משקל" },
  "tc.gender":           { en: "Gender", he: "מגדר" },
  "tc.gender.female":    { en: "Female", he: "נקבה" },
  "tc.gender.male":      { en: "Male", he: "זכר" },
  "tc.gender.nb":        { en: "Non-binary", he: "לא-בינארי" },
  "tc.skinTone":         { en: "Skin tone", he: "גוון עור" },
  "tc.eyeColor":         { en: "Eye color", he: "צבע עיניים" },
  "tc.hairColor":        { en: "Hair color", he: "צבע שיער" },
  "tc.hairLength":       { en: "Hair length", he: "אורך שיער" },
  "tc.hair.short":       { en: "Short", he: "קצר" },
  "tc.hair.medium":      { en: "Medium", he: "בינוני" },
  "tc.hair.long":        { en: "Long", he: "ארוך" },
  "tc.languages":        { en: "Languages", he: "שפות" },
  "tc.skills":           { en: "Special skills", he: "כישורים מיוחדים" },
  "tc.ageRange":         { en: "Age range you can play", he: "טווח גילאים שאתה יכול לשחק" },
  "tc.ageFrom":          { en: "From", he: "מ-" },
  "tc.ageTo":            { en: "To", he: "עד" },
  "tc.genres":           { en: "Genres you love", he: "ז'אנרים אהובים" },
  "tc.continue":         { en: "Continue", he: "המשך" },
  "tc.enterCastIt":      { en: "Enter CastIt", he: "כניסה ל-CastIt" },

  // Avatar
  "av.headerTitle":      { en: "Your avatar", he: "האווטאר שלך" },
  "av.eyebrow":          { en: "Generated from your typecast", he: "נוצר מה-Typecast שלך" },
  "av.titleA":           { en: "Meet your", he: "תכיר את ה-" },
  "av.titleB":           { en: "double", he: "כפיל" },
  "av.titleC":           { en: ".", he: " שלך." },
  "av.sub":              { en: "Built from the skin, eye and hair colors you locked in. Pick a variation that feels most like you.", he: "נבנה מצבעי העור, העיניים והשיער שבחרת. בחר את הוואריאציה שמרגישה הכי נכון." },
  "av.reflect.skin":     { en: "Skin", he: "עור" },
  "av.reflect.closest":  { en: "closest match", he: "התאמה קרובה" },
  "av.reflect.hair":     { en: "Hair", he: "שיער" },
  "av.reflect.eyes":     { en: "Eyes", he: "עיניים" },
  "av.reflect.matched":  { en: "matched", he: "תואמים" },
  "av.variations":       { en: "Variations", he: "וואריאציות" },
  "av.regenerate":       { en: "Regenerate", he: "צור מחדש" },
  "av.enter":            { en: "Enter CastIt", he: "כניסה ל-CastIt" },

  // Pro signup / login
  "proAuth.signupHeader":{ en: "Open Pro account", he: "פתח חשבון Pro" },
  "proAuth.signupTitleA":{ en: "Welcome to", he: "ברוכים הבאים ל-" },
  "proAuth.signupTitleB":{ en: "CastIt Pro", he: "CastIt Pro" },
  "proAuth.signupSub":   { en: "Tell us where you cast from.", he: "ספרי לנו מאיפה את מלהקת." },
  "proAuth.yourFullName":{ en: "Your full name", he: "השם המלא שלך" },
  "proAuth.company":     { en: "Company or studio", he: "חברה או סטודיו" },
  "proAuth.role":        { en: "Role", he: "תפקיד" },
  "proAuth.workEmail":   { en: "Work email", he: "אימייל עבודה" },
  "proAuth.password":    { en: "Password (min 6 chars)", he: "סיסמה (לפחות 6 תווים)" },
  "proAuth.creating":    { en: "Creating account…", he: "יוצר חשבון…" },
  "proAuth.continue":    { en: "Continue", he: "המשך" },
  "proAuth.alreadyPro":  { en: "Already a Pro?", he: "כבר יש לך חשבון Pro?" },
  "proAuth.signIn":      { en: "Sign in", he: "התחבר" },
  "proAuth.loginHeader": { en: "Pro sign in", he: "התחברות Pro" },
  "proAuth.loginTitle":  { en: "Welcome back.", he: "ברוכים השבים." },
  "proAuth.loginSub":    { en: "Pick up where you left off.", he: "המשך מהמקום שעצרת." },
  "proAuth.passwordPlain": { en: "Password", he: "סיסמה" },
  "proAuth.signingIn":   { en: "Signing in…", he: "מתחבר…" },
  "proAuth.signInBtn":   { en: "Sign in", he: "התחבר" },
  "proAuth.newHere":     { en: "New here?", he: "חדש כאן?" },
  "proAuth.openAccount": { en: "Open an account", he: "פתח חשבון" },
  "proAuth.role.director":  { en: "Casting Director", he: "במאי ליהוק" },
  "proAuth.role.associate": { en: "Casting Associate", he: "עוזר ליהוק" },
  "proAuth.role.agent":     { en: "Agent", he: "סוכן" },
  "proAuth.role.manager":   { en: "Manager", he: "מנהל" },
  "proAuth.role.producer":  { en: "Producer", he: "מפיק" },
  "proAuth.role.dir":       { en: "Director", he: "במאי" },

  // Header
  "header.back":         { en: "Back", he: "חזור" },

  // Opportunities (For You) page
  "opp.headerA":      { en: "For", he: "בשבילך" },
  "opp.headerB":      { en: "You", he: "" },
  "opp.streak":       { en: "{n} day streak", he: "{n} ימי רצף" },
  "opp.tab.daily":    { en: "Daily",     he: "יומי" },
  "opp.tab.auditions":{ en: "Auditions", he: "אודישנים" },
  "opp.tab.castings": { en: "Castings",  he: "קסטינגים" },
  "opp.tab.stars":    { en: "Stars",     he: "כוכבים" },
  // Castings (search projects → apply)
  "opp.cast.hint":    { en: "Swipe right to apply · swipe left to skip", he: "החלק ימינה להגשה · שמאלה לדילוג" },
  "opp.cast.apply":   { en: "Apply", he: "הגש" },
  "opp.cast.skip":    { en: "Skip",  he: "דלג" },
  "opp.cast.paid":    { en: "PAID",  he: "בתשלום" },
  "opp.cast.by":      { en: "by {date}", he: "עד {date}" },
  "opp.cast.years":   { en: "{a}–{b} yrs", he: "גילאי {a}–{b}" },
  "opp.cast.applied": { en: "{n} applied",  he: "{n} הגישו" },
  "opp.cast.youApplied": { en: "Applied", he: "הוגש" },
  "opp.cast.allCaughtUp.title": { en: "All caught up", he: "סיימת לעבור על הכל" },
  "opp.cast.allCaughtUp.desc":  { en: "You've reviewed all castings. Check back tomorrow for new roles.", he: "עברת על כל הקסטינגים. תחזור מחר לתפקידים חדשים." },
  "opp.cast.viewAuditions":     { en: "View auditions", he: "צפה באודישנים" },
  // Apply modal
  "opp.apply.sent":      { en: "Application sent!", he: "ההגשה נשלחה!" },
  "opp.apply.aria":      { en: "You'll hear back via Aria when there's news.", he: "תקבל עדכון מ-Aria כשיש חדשות." },
  "opp.apply.coverLabel":{ en: "Cover note (optional)", he: "מכתב מקדים (אופציונלי)" },
  "opp.apply.coverPh":   { en: "Tell them why you're a great fit…", he: "ספר להם למה אתה מתאים…" },
  "opp.apply.as":        { en: "Applying as", he: "מגיש בשם" },
  "opp.apply.sending":   { en: "Sending…", he: "שולח…" },
  "opp.apply.submit":    { en: "Submit Application", he: "שלח הגשה" },
  // Auditions sub-tab
  "opp.aud.sorted":      { en: "Sorted by match to your typecast", he: "ממוין לפי התאמה ל-Typecast שלך" },
  "opp.aud.empty.title": { en: "No live auditions for you yet", he: "אין אודישנים פעילים בשבילך" },
  "opp.aud.empty.desc":  { en: "Casting pros post here. Complete your typecast so you appear in their search.", he: "מלהקים מפרסמים כאן. השלם את ה-Typecast שלך כדי להופיע בחיפושים שלהם." },
  "opp.aud.empty.cta":   { en: "Edit my typecast", he: "ערוך את ה-Typecast" },
  "opp.aud.paid":        { en: "Paid", he: "בתשלום" },
  // Daily sub-tab
  "opp.daily.digestEyebrow": { en: "Weekly digest", he: "סיכום שבועי" },
  "opp.daily.digestTitle":   { en: "This week in casting", he: "השבוע בליהוק" },
  "opp.daily.viewAll":       { en: "View all opportunities", he: "כל ההזדמנויות" },
  "opp.daily.todaysChallenge": { en: "Today's challenge", he: "האתגר היומי" },
  "opp.daily.daysLeft": { en: "{n} days left", he: "{n} ימים נותרו" },
  "opp.daily.joined":   { en: "{n} joined", he: "{n} הצטרפו" },
  "opp.daily.submit":   { en: "Submit your take", he: "שלח את הגרסה שלך" },
  "opp.daily.more":     { en: "More this week", he: "עוד השבוע" },
  "opp.daily.daysLeftShort": { en: "{n}d left", he: "{n} ימים" },
  "opp.daily.join":     { en: "Join →", he: "הצטרף →" },
  // Stars sub-tab
  "opp.stars.thisWeek": { en: "This week", he: "השבוע" },
  "opp.stars.rising":   { en: "Rising", he: "בעלייה" },

  // Talent profile page
  "prof.bioDefault":   { en: "Welcome to your profile.", he: "ברוכים הבאים לפרופיל שלך." },
  "prof.stat.followers":   { en: "Followers",   he: "עוקבים" },
  "prof.stat.likes":       { en: "Likes",       he: "לייקים" },
  "prof.stat.submissions": { en: "Submissions", he: "הגשות" },
  "prof.stat.dayStreak":   { en: "Day Streak",  he: "ימי רצף" },
  "prof.complete":         { en: "Complete →",  he: "← השלם" },
  "prof.viewers.title":    { en: "Who viewed you", he: "מי צפה בך" },
  "prof.viewers.thisWeek": { en: "{n} this week",  he: "{n} השבוע" },
  "prof.viewers.upgrade":  { en: "Upgrade to see all viewers", he: "שדרג כדי לראות את כל הצופים" },
  "prof.role.castingDirector": { en: "Casting Director", he: "במאי ליהוק" },
  "prof.role.talentAgent":     { en: "Talent Agent",     he: "סוכן כישרונות" },
  "prof.role.productionCo":    { en: "Production Co.",   he: "חברת הפקה" },
  "prof.edit":         { en: "Edit profile", he: "ערוך פרופיל" },
  "prof.saved":        { en: "Saved",        he: "שמורים" },
  "prof.calendar":     { en: "Calendar",     he: "יומן" },
  "prof.sendAudition": { en: "Send audition", he: "שלח אודישן" },
  "prof.follow":       { en: "Follow",       he: "עקוב" },
  "prof.message":      { en: "Message",      he: "הודעה" },
  "prof.tab.reels":     { en: "Reels",     he: "רילים" },
  "prof.tab.headshots": { en: "Headshots", he: "תמונות ראש" },
  "prof.tab.typecast":  { en: "Typecast",  he: "Typecast" },
  // Edit modal
  "prof.edit.title":   { en: "Edit profile", he: "ערוך פרופיל" },
  "prof.edit.updated": { en: "Profile updated!", he: "הפרופיל עודכן!" },
  "prof.edit.changePhoto": { en: "Tap to change photo", he: "הקש להחלפת תמונה" },
  "prof.edit.name":    { en: "Name", he: "שם" },
  "prof.edit.bio":     { en: "Bio",  he: "ביוגרפיה" },
  "prof.edit.saving":  { en: "Saving…", he: "שומר…" },
  "prof.edit.save":    { en: "Save changes", he: "שמור שינויים" },
  // Settings sheet
  "prof.settings.title":   { en: "Settings", he: "הגדרות" },
  "prof.settings.language":{ en: "Language", he: "שפה" },
  "prof.settings.close":   { en: "Close", he: "סגור" },
  // Typecast card on profile
  "prof.tc.title":     { en: "Typecast Card", he: "כרטיס Typecast" },
  "prof.tc.height":    { en: "Height", he: "גובה" },
  "prof.tc.weight":    { en: "Weight", he: "משקל" },
  "prof.tc.gender":    { en: "Gender", he: "מגדר" },
  "prof.tc.ageRange":  { en: "Age range", he: "טווח גילאים" },
  "prof.tc.skin":      { en: "Skin",  he: "עור" },
  "prof.tc.eyes":      { en: "Eyes",  he: "עיניים" },
  "prof.tc.hair":      { en: "Hair",  he: "שיער" },
  "prof.tc.hairLength":{ en: "Hair length", he: "אורך שיער" },
  "prof.tc.languages": { en: "Languages",  he: "שפות" },
  "prof.tc.skills":    { en: "Skills",  he: "כישורים" },
  "prof.tc.genres":    { en: "Genres",  he: "ז'אנרים" },

  // Audition inbox
  "inbox.headerTitle":   { en: "Auditions", he: "אודישנים" },
  "inbox.titleA":        { en: "Your", he: "האודישנים" },
  "inbox.titleB":        { en: "audition inbox", he: "שלך" },
  "inbox.sub":           { en: "Every invite, every status, in one place.", he: "כל הזמנה, כל סטטוס, במקום אחד." },
  "inbox.tapesToRecord": { en: "{n} tape to record.", he: "{n} טייפים להקלטה." },
  "inbox.tapeToRecord":  { en: "1 tape to record.", he: "טייפ אחד להקלטה." },
  "inbox.tapStart":      { en: "Tap any invite below to start.", he: "הקש על הזמנה למטה כדי להתחיל." },
  "inbox.tab.active":    { en: "Active", he: "פעיל" },
  "inbox.tab.history":   { en: "History", he: "היסטוריה" },
  "inbox.empty.activeTitle":    { en: "No active auditions", he: "אין אודישנים פעילים" },
  "inbox.empty.activeDesc":     { en: "When a casting pro invites you to read for a role, the invite shows up here.", he: "כשמלהק יזמין אותך לתפקיד, ההזמנה תופיע כאן." },
  "inbox.empty.historyTitle":   { en: "No history yet", he: "עדיין אין היסטוריה" },
  "inbox.empty.historyDesc":    { en: "Past auditions you've completed or that were closed appear here.", he: "אודישנים שסיימת או שנסגרו יופיעו כאן." },
  "inbox.deadlinePassed": { en: "Deadline passed", he: "הדדליין עבר" },
  "inbox.dueToday":       { en: "Due today", he: "נדרש היום" },
  "inbox.dueIn":          { en: "Due in {n}d", he: "תוך {n} ימים" },
  "inbox.deadline":       { en: "Deadline {date}", he: "דדליין {date}" },
  "inbox.shoot":          { en: "Shoot:", he: "צילום:" },
  "inbox.recordSelfTape": { en: "Record self-tape", he: "הקלט סלף-טייפ" },
  "inbox.recordCallback": { en: "Record callback tape", he: "הקלט טייפ לקולבק" },
  "inbox.rejected":       { en: "Casting moved in a different direction", he: "הליהוק לקח כיוון אחר" },
  "inbox.status.submitted":   { en: "Your tape was received — awaiting decision.", he: "הטייפ שלך התקבל — ממתין להחלטה." },
  "inbox.status.hold":        { en: "Casting placed you on hold — they'll update you soon.", he: "הליהוק העבירו אותך ל-Hold — יעדכנו בקרוב." },
  "inbox.status.avail_check": { en: "Confirm your availability — production will follow up.", he: "אשר את הזמינות שלך — ההפקה תחזור אליך." },
  "inbox.status.offered":     { en: "You have an offer — check your messages.", he: "יש לך הצעה — בדוק את ההודעות." },
  "inbox.status.booked":      { en: "🎉 Booked. Production will be in touch.", he: "🎉 אושרת. ההפקה תיצור קשר." },
  "inbox.status.rejected":    { en: "Casting passed on this role.", he: "הליהוק העביר את התפקיד הזה." },

  // Submission pipeline stages (timeline labels)
  "stage.invited":     { en: "Invited",     he: "הוזמן" },
  "stage.submitted":   { en: "Submitted",   he: "הוגש" },
  "stage.callback":    { en: "Callback",    he: "קולבק" },
  "stage.avail":       { en: "Avail",       he: "זמינות" },
  "stage.offer":       { en: "Offer",       he: "הצעה" },
  "stage.booked":      { en: "Booked",      he: "אושר" },
  "stage.toReview":    { en: "To Review",   he: "לסקירה" },
  "stage.label.invited":     { en: "Invited",     he: "הוזמן" },
  "stage.label.submitted":   { en: "To review",   he: "לסקירה" },
  "stage.label.callback":    { en: "Callback",    he: "קולבק" },
  "stage.label.hold":        { en: "Hold",        he: "השהיה" },
  "stage.label.avail_check": { en: "Avail check", he: "זמינות" },
  "stage.label.offered":     { en: "Offer out",   he: "הצעה" },
  "stage.label.booked":      { en: "Booked",      he: "אושר" },
  "stage.label.rejected":    { en: "Passed",      he: "נדחה" },

  // Talent attribute values — canonical English stored, Hebrew shown
  "value.lang.Hebrew":   { en: "Hebrew",   he: "עברית" },
  "value.lang.English":  { en: "English",  he: "אנגלית" },
  "value.lang.Arabic":   { en: "Arabic",   he: "ערבית" },
  "value.lang.Russian":  { en: "Russian",  he: "רוסית" },
  "value.lang.French":   { en: "French",   he: "צרפתית" },
  "value.lang.Spanish":  { en: "Spanish",  he: "ספרדית" },
  "value.lang.German":   { en: "German",   he: "גרמנית" },
  "value.lang.Italian":  { en: "Italian",  he: "איטלקית" },
  "value.skill.Stage Combat":     { en: "Stage Combat",     he: "קרב במה" },
  "value.skill.Singing":          { en: "Singing",          he: "שירה" },
  "value.skill.Dance":            { en: "Dance",            he: "ריקוד" },
  "value.skill.Improv":           { en: "Improv",           he: "אלתור" },
  "value.skill.Horseback Riding": { en: "Horseback Riding", he: "רכיבה על סוסים" },
  "value.skill.Martial Arts":     { en: "Martial Arts",     he: "אומנויות לחימה" },
  "value.skill.Piano":            { en: "Piano",            he: "פסנתר" },
  "value.skill.Guitar":           { en: "Guitar",           he: "גיטרה" },
  "value.skill.Driving (Stick)":  { en: "Driving (Stick)",  he: "נהיגה בידנית" },
  "value.skill.Surfing":          { en: "Surfing",          he: "גלישת גלים" },
  "value.skill.Skateboarding":    { en: "Skateboarding",    he: "סקייטבורד" },
  "value.skill.Dialects":         { en: "Dialects",         he: "דיאלקטים" },
  "value.skill.Drama":            { en: "Drama",            he: "דרמה" },
  "value.skill.Comedy":           { en: "Comedy",           he: "קומדיה" },
  "value.genre.Drama":      { en: "Drama",      he: "דרמה" },
  "value.genre.Comedy":     { en: "Comedy",     he: "קומדיה" },
  "value.genre.Thriller":   { en: "Thriller",   he: "מותחן" },
  "value.genre.Action":     { en: "Action",     he: "אקשן" },
  "value.genre.Romance":    { en: "Romance",    he: "רומנטיקה" },
  "value.genre.Indie":      { en: "Indie",      he: "אינדי" },
  "value.genre.Period":     { en: "Period",     he: "פרק זמן" },
  "value.genre.Horror":     { en: "Horror",     he: "אימה" },
  "value.genre.Musical":    { en: "Musical",    he: "מיוזיקל" },
  "value.genre.Commercial": { en: "Commercial", he: "פרסומת" },
  "value.hair.Short":  { en: "Short",  he: "קצר" },
  "value.hair.Medium": { en: "Medium", he: "בינוני" },
  "value.hair.Long":   { en: "Long",   he: "ארוך" },

  // Project type display
  "value.type.Feature Film": { en: "Feature Film",  he: "סרט עלילתי" },
  "value.type.TV Series":    { en: "TV Series",     he: "סדרת טלוויזיה" },
  "value.type.Commercial":   { en: "Commercial",    he: "פרסומת" },
  "value.type.Short Film":   { en: "Short Film",    he: "סרט קצר" },
  "value.type.Theater":      { en: "Theater",       he: "תיאטרון" },
  "value.type.Theatre":      { en: "Theatre",       he: "תיאטרון" },
  "value.type.Music Video":  { en: "Music Video",   he: "קליפ" },
  "value.type.Voice-over":   { en: "Voice-over",    he: "דיבוב" },

  // Onboarding tour (modal)
  "tour.skip":           { en: "Skip", he: "דלג" },
  "tour.back":           { en: "Back", he: "חזור" },
  "tour.lets":           { en: "Let's go", he: "בואו נתחיל" },
  "tour.next":           { en: "Next ({n}/{total})", he: "הבא ({n}/{total})" },
  // Talent steps
  "tour.t1.title":       { en: "Welcome to CastIt", he: "ברוכים הבאים ל-CastIt" },
  "tour.t1.body":        { en: "The first casting platform that works for you — not against you. We'll show you what lives where in 60 seconds.", he: "פלטפורמת הליהוק הראשונה שעובדת בשבילך — לא בשבילם. נראה לך מה נמצא היכן ב-60 שניות." },
  "tour.t2.title":       { en: "Self-tape inside the app", he: "הקלטת טייפ בתוך האפליקציה" },
  "tour.t2.body":        { en: "When you get an invite, you can record a tape with a framing guide, your lines on screen, and multiple takes. Aria will even give you directing notes before you start.", he: "כשתקבל הזמנה, תוכל להקליט טייפ עם מדריך מסגרת, הטקסט על המסך, וכמה לקיחות. Aria אפילו תיתן לך הוראות בימוי לפני שתתחיל." },
  "tour.t2.cta":         { en: "Auditions inbox", he: "תיבת אודישנים" },
  "tour.t3.title":       { en: "AI Coach for prep", he: "מאמן AI להכנה" },
  "tour.t3.body":        { en: "Upload a scene (image or text) → pick your role and your partner's voice and tone → rehearse with her like a real coach. Saved to your library.", he: "העלה סצנה (תמונה או טקסט) → בחר את התפקיד שלך, את הקול והטונציה של השותף → תרגל איתה כמו עם מאמן אמיתי. נשמר בספרייה." },
  "tour.t3.cta":         { en: "Open Coach", he: "פתח את המאמן" },
  "tour.t4.title":       { en: "You're visible in search", he: "אתה גלוי בחיפוש" },
  "tour.t4.body":        { en: "Casting pros search by 17 parameters — height, languages, accents, skills. The fuller your profile, the more often you'll appear.", he: "מלהקים מחפשים לפי 17 פרמטרים — גובה, שפות, מבטאים, כישורים. ככל שהפרופיל שלך מלא יותר, כך תופיע יותר." },
  "tour.t4.cta":         { en: "Build your typecast", he: "בנה את ה-Typecast שלך" },
  // Pro steps
  "tour.p1.title":       { en: "Welcome to CastIt Pro", he: "ברוכים הבאים ל-CastIt Pro" },
  "tour.p1.body":        { en: "A full casting pipeline + AI working for you. We'll cover the 4 tools you'll use every day.", he: "Pipeline ליהוק מלא + AI שעובד בשבילך. נסקור 4 כלים שתשתמש בהם כל יום." },
  "tour.p2.title":       { en: "Unified action inbox", he: "תיבת פעולות מאוחדת" },
  "tour.p2.body":        { en: "Every action that needs your attention — across all projects — in one place. Holds about to expire, tapes to review, offers waiting.", he: "כל הפעולות הדורשות תשומת לב — חוצה פרויקטים — במקום אחד. Holds שעומדים לפוג, טייפים לסקירה, offers שמחכים." },
  "tour.p2.cta":         { en: "Action inbox", he: "תיבת פעולות" },
  "tour.p3.title":       { en: "Tape triage mode", he: "מצב סקירת טייפים" },
  "tour.p3.body":        { en: "Swipe right=Callback, left=Pass, up=Hold. Triage 50 tapes in 5 minutes instead of an hour.", he: "החלק ימינה=Callback, שמאלה=Pass, למעלה=Hold. סקור 50 טייפים ב-5 דקות במקום שעה." },
  "tour.p3.cta":         { en: "Triage", he: "סקירה" },
  "tour.p4.title":       { en: "AI at every stage", he: "AI לכל שלב" },
  "tour.p4.body":        { en: "Bulk roles get a breakdown and build all your roles. Tape analysis scans every tape and prepares a report. Comm automation writes messages for you.", he: "תפקידים במצב Bulk מקבלים breakdown ובונים את כל התפקידים. ניתוח טייפים סורק כל טייפ ומכין דוח. אוטומציית תקשורת כותבת הודעות במקומך." },
  "tour.p4.cta":         { en: "Projects", he: "פרויקטים" },
  "tour.p5.title":       { en: "Director reviews", he: "סקירות במאי" },
  "tour.p5.body":        { en: "Pick 5 tapes → send a link to the director → they vote 👍/🤔/👎 → you see it in real time. No more WeTransfer, no more calls.", he: "בוחר 5 טייפים → שולח קישור לבמאי → הוא מצביע 👍/🤔/👎 → אתה רואה בזמן אמת. בלי WeTransfer, בלי שיחות." },
  "tour.p5.cta":         { en: "Director reviews", he: "סקירות במאי" },

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
