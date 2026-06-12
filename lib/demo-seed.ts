"use client";

// Auto-seeds the localStorage with realistic demo data on first launch.
// Lets investors open the app and see a "running" platform instead of
// empty states. Idempotent — only seeds when storage is empty.

import { TALENTS } from "@/lib/mock-data";
import {
  loadProjects, loadRoles, loadSubmissions,
  addProject, addRole, inviteTalent, addTape,
  moveToCallback, markCallbackDone, moveToHold, sendOffer, confirmBooked, rejectSubmission,
  moveToAvailCheck,
} from "@/lib/projects-store";
import { createApprovalSession } from "@/lib/approval-store";
import { addNotification } from "@/lib/notifications-store";

// Bump SEED_FLAG when demo content changes — older v* keys are auto-purged
// on next mount so users see the latest Hebrew demo without manual reset.
const SEED_FLAG = "castit_demo_seeded_v3_he";
const STALE_FLAGS = ["castit_demo_seeded_v2", "castit_demo_seeded_v1"];
const DEMO_STORAGE_KEYS = [
  "castit_projects_v2", "castit_roles_v3", "castit_submissions_v3",
  "castit_approval_sessions_v1", "castit_share_packets_v1",
  "castit_coach_scenes_v1", "castit_coach_takes_v1",
  "castit_notifications_v1",
];

export function isDemoSeeded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SEED_FLAG) === "1";
}

export function resetDemo(): void {
  if (typeof window === "undefined") return;
  for (const k of [...DEMO_STORAGE_KEYS, SEED_FLAG, ...STALE_FLAGS]) localStorage.removeItem(k);
  window.location.href = "/welcome";
}

const HOURS = 3_600_000;
const DAYS = 86_400_000;

export function seedDemo(): void {
  if (typeof window === "undefined") return;
  // Migration: if any older seed flag exists, this is stale demo data —
  // purge it so the new Hebrew content takes over without a manual reset.
  const hasStaleFlag = STALE_FLAGS.some((k) => localStorage.getItem(k) != null);
  if (hasStaleFlag) {
    for (const k of [...DEMO_STORAGE_KEYS, ...STALE_FLAGS]) localStorage.removeItem(k);
  }
  if (isDemoSeeded()) return;
  if (loadProjects().length > 0) {
    // Already has real data — don't overwrite
    localStorage.setItem(SEED_FLAG, "1");
    return;
  }

  // ─── Project 1: Feature film, full casting ──────────
  const after = addProject({
    title: "אחרי הגשם",
    studio: "אולפני צפון-רוח",
    type: "Feature Film",
    status: "casting",
    posterColor: "#8B5A3C",
    description: "דרמה בכפר דייגים קטן. הבת חוזרת הביתה, האב מנוכר, ועונת הסערות מתקרבת.",
    mode: "full",
  });

  const mayaRole = addRole({
    projectId: after.id,
    name: "מאיה — תפקיד ראשי",
    description: "נשית, 25-32, מראה ים-תיכוני. חוזרת הביתה אחרי 8 שנים. מאופקת, ערנית, נשברת באקט 3.",
    sides: "פנים. מטבח — לילה\n\nמאיה: אמרתי לך, אני לא עושה את זה.\nדוד: זה כבר לא קשור אלייך.\nמאיה: זה אף פעם לא היה קשור אליי. זאת הבעיה.",
    selfTapeInstructions: "סלייט קודם. מסך אנכי, תאורה טובה. שני טייקים — אחד מאופק, אחד פתוח.",
    deadline: new Date(Date.now() + 3 * DAYS).toISOString().slice(0, 10),
    shootDates: "12 באוג׳ – 25 בספט׳",
    payRange: "₪6,500-8,000 ליום + נסיעות",
  });

  const davidRole = addRole({
    projectId: after.id,
    name: "דוד — אבא",
    description: "גברי, 55-65. שקט, חרוש קמטים, נושא עשרות שנים של חרטה. הידיים חשובות.",
    sides: "פנים. מטבח — לילה\n\nדוד: זה כבר לא קשור אלייך.\nמאיה: זה אף פעם לא היה קשור אליי. זאת הבעיה.",
    deadline: new Date(Date.now() + 5 * DAYS).toISOString().slice(0, 10),
    shootDates: "12 באוג׳ – 25 בספט׳",
    payRange: "₪5,400 ליום",
  });

  // Maya submissions — varied pipeline stages
  const s_maya_t1 = inviteTalent(mayaRole.id,
    { id: TALENTS[0].id, name: TALENTS[0].name, photo: TALENTS[0].photo },
    { message: "אהבתי את הריל שלך — אשמח שתקראי למאיה.", deadline: mayaRole.deadline },
  );
  addTape(s_maya_t1.id, { note: "הוגש בזמן. קריאה נקייה בשני טייקים." });
  // Maya's callback is scheduled in-person, not yet completed (showcases new flow)
  moveToCallback(s_maya_t1.id, {
    message: "הגשה מצוינת. נשמח לראות אותך בקולבק פרונטלי.",
    type: "in_person",
    scheduledAt: new Date(Date.now() + 2 * DAYS + 4 * HOURS).toISOString(),
    location: "אולפני תגדה, תל אביב — חדר 3",
  });
  const s_maya_t3 = inviteTalent(mayaRole.id,
    { id: TALENTS[2].id, name: TALENTS[2].name, photo: TALENTS[2].photo },
    { message: "לקרוא למאיה?", deadline: mayaRole.deadline },
  );
  addTape(s_maya_t3.id, { note: "טייפ סבב 1 — בחירה אמיצה בשורת הפתיחה." });
  // leave at "submitted" — appears in Triage

  const s_maya_t5 = inviteTalent(mayaRole.id,
    { id: TALENTS[4].id, name: TALENTS[4].name, photo: TALENTS[4].photo },
    { message: "שמענו מהסוכן שלך — אנא הקליטי.", deadline: mayaRole.deadline },
  );
  addTape(s_maya_t5.id, { note: "סלף-טייפ" });
  moveToHold(s_maya_t5.id, "עבודה מצוינת — נשהה ל-48 שעות בזמן שאנו מסיימים.", 36);

  const s_maya_t6 = inviteTalent(mayaRole.id,
    { id: TALENTS[5].id, name: TALENTS[5].name, photo: TALENTS[5].photo },
    { deadline: new Date(Date.now() - 1 * DAYS).toISOString().slice(0, 10) },
  );
  // leave at "invited" — deadline_passed urgency

  // David submissions
  const s_david_t4 = inviteTalent(davidRole.id,
    { id: TALENTS[3].id, name: TALENTS[3].name, photo: TALENTS[3].photo },
    { message: "נשמח שתקרא לדוד." },
  );
  addTape(s_david_t4.id, { note: "קריאה מאופקת ויפהפייה." });
  // David's callback was scheduled in-person AND completed → unblocks avail check
  moveToCallback(s_david_t4.id, {
    message: "אהבנו. קולבק?",
    type: "in_person",
    scheduledAt: new Date(Date.now() - 1 * DAYS).toISOString(),
    location: "משרדי צפון-רוח",
  });
  markCallbackDone(s_david_t4.id, "כימיה מצוינת עם האנרגיה. אנו בטוחים בתפקיד.");
  addTape(s_david_t4.id, { note: "סבב 2 — אפילו יותר טוב. ההתאמות תפסו." });
  moveToAvailCheck(s_david_t4.id, "12 באוג׳ – 25 בספט׳", "בודקים את הזמינות שלך לחלון הצילום.");

  const s_david_t2 = inviteTalent(davidRole.id,
    { id: TALENTS[1].id, name: TALENTS[1].name, photo: TALENTS[1].photo },
  );
  addTape(s_david_t2.id, { note: "קריאה ראשונה" });
  rejectSubmission(s_david_t2.id, "תודה — לקחנו כיוון אחר.");

  // ─── Project 2: TV Series, full casting ─────────────
  const wave = addProject({
    title: "הגל שמתחת",
    studio: "אולפני פלום",
    type: "TV Series",
    status: "callbacks",
    posterColor: "#3C5A8B",
    description: "מותחן פסיכולוגי ב-8 פרקים. שלושה צירי זמן, דירה אחת, סוד אחד.",
    mode: "full",
  });

  const detRole = addRole({
    projectId: wave.id,
    name: "הבלש בן",
    description: "גברי, 40-50. שיטתי, מאופק. נושא צליעה שקטה מפציעה ישנה.",
    sides: "פנים. חדר חקירות\n\nבן: אני לא שואל שוב.\nחשוד: אז אל תשאל.",
    shootDates: "1 באוק׳ – 15 בדצמ׳",
    payRange: "תעריף סדרה" ,
  });

  const s_ben_t4 = inviteTalent(detRole.id,
    { id: TALENTS[3].id, name: TALENTS[3].name, photo: TALENTS[3].photo },
  );
  addTape(s_ben_t4.id, { note: "סבב 1" });
  // Ben's callback was a tape callback that has been completed → moved to offer
  moveToCallback(s_ben_t4.id, { type: "tape", message: "צורפו קטעי טקסט חדשים — שלחי טייפ לקולבק." });
  addTape(s_ben_t4.id, { note: "טייפ קולבק סבב 2 — חד יותר" }); // auto-completes the tape callback
  sendOffer(s_ben_t4.id, "₪9,000 לפרק × 8 + תמלוגים", "הצעה רשמית על השולחן. נשמח להפוך את זה לרשמי.");

  const s_ben_t6 = inviteTalent(detRole.id,
    { id: TALENTS[5].id, name: TALENTS[5].name, photo: TALENTS[5].photo },
  );
  addTape(s_ben_t6.id, { note: "סבב 1 חזק" });
  moveToHold(s_ben_t6.id, "משהים בזמן שאנחנו ממיינים הצעות.", 18); // hold_expiring within 24h

  // ─── Project 3: Commercial, QUICK CAST ──────────────
  const aroma = addProject({
    title: "ארומה — פרסומת קיץ",
    studio: "סוכנות תגדה",
    type: "Commercial",
    status: "casting",
    posterColor: "#5C7548",
    description: "פרסומת של 60 שניות. בית קפה על החוף, שלושה חברים, קסם של שעת הזהב.",
    mode: "quick",
  });

  const friendsRole = addRole({
    projectId: aroma.id,
    name: "קבוצת חברים (3 טיפוסים)",
    description: "20-35, מראים מגוונים. רקע/לא דיבורי אבל מודגש.",
    shootDates: "10-12 ביוני",
    payRange: "₪800 ליום",
  });

  // Bulk invite for quick cast
  for (let i = 0; i < TALENTS.length; i++) {
    const s = inviteTalent(friendsRole.id, {
      id: TALENTS[i].id, name: TALENTS[i].name, photo: TALENTS[i].photo,
    });
    addTape(s.id, { note: "Quick self-tape" });
    // Mix: 2 selected, 2 still to review, 2 rejected
    if (i < 2) confirmBooked(s.id);
    else if (i < 4) {
      // leave at "submitted" for review
    } else {
      rejectSubmission(s.id);
    }
  }

  // ─── Sample Approval Session ────────────────────────
  const callbackSubs = [s_maya_t1, s_maya_t5].map((s) => ({
    submissionId: s.id,
    talentId: s.talentId,
    talentName: s.talentName,
    talentPhoto: s.talentPhoto,
    roleName: "מאיה — תפקיד ראשי",
    tapeBlobKey: undefined,
    tapeUrl: undefined,
  }));

  createApprovalSession({
    proName: "במאי ליהוק",
    projectTitle: after.title,
    roleName: "מאיה — תפקיד ראשי",
    greeting: "היי — שתי המועמדות המובילות למאיה. סמני את האינטואיציה: כן / אולי / לא. אני אראה זאת מסונכרן בזמן אמת.",
    talents: callbackSubs,
    expiresAt: new Date(Date.now() + 14 * DAYS).toISOString(),
  });

  // ─── Seed Notifications ─────────────────────────────
  // Talent-facing
  addNotification({
    audience: "talent",
    kind: "callback",
    title: "🎉 קולבק למאיה",
    body: "אולפני צפון-רוח רוצים אותך לסיבוב הבא של 'אחרי הגשם'",
    href: "/inbox",
  });
  addNotification({
    audience: "talent",
    kind: "invite",
    title: "הזמנה חדשה: הבלש בן",
    body: "אולפני פלום — קרא לתפקיד ב'הגל שמתחת'",
    href: "/inbox",
  });
  addNotification({
    audience: "talent",
    kind: "casting",
    title: "התאמת קסטינג חדשה",
    body: "תפקיד חדש שמתאים לפרופיל שלך — תפקיד ראשי נשי 25-32",
    href: "/auditions",
  });
  addNotification({
    audience: "talent",
    kind: "like",
    title: "דניאל כהן אהב את הריל שלך",
    body: "מונולוג מ'חשמלית ושמה תשוקה'",
    href: "/feed",
  });

  // Pro-facing
  addNotification({
    audience: "pro",
    kind: "tape_in",
    title: "טייפ חדש מנועה ידיד",
    body: `עבור מאיה — תפקיד ראשי. מחכה לסקירה שלך.`,
    href: `/pro/projects/${after.id}/role/${mayaRole.id}/submission/${s_maya_t3.id}`,
  });
  addNotification({
    audience: "pro",
    kind: "hold",
    title: "השהיה עומדת לפוג: שירן מור",
    body: "מאיה — תפקיד ראשי · נשארו 12 שעות, החליטי בהקדם",
    href: `/pro/projects/${after.id}/role/${mayaRole.id}/submission/${s_maya_t5.id}`,
  });
  addNotification({
    audience: "pro",
    kind: "vote",
    title: "המפיק הצביע 👍 על מאיה לוי",
    body: "סקירת במאי של 'אחרי הגשם' — 1/2 הצביעו",
    href: "/pro/approvals",
  });

  // Done
  localStorage.setItem(SEED_FLAG, "1");
}
