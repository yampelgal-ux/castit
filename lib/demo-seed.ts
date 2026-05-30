"use client";

// Auto-seeds the localStorage with realistic demo data on first launch.
// Lets investors open the app and see a "running" platform instead of
// empty states. Idempotent — only seeds when storage is empty.

import { TALENTS } from "@/lib/mock-data";
import {
  loadProjects, loadRoles, loadSubmissions,
  addProject, addRole, inviteTalent, addTape,
  moveToCallback, markCallbackDone, moveToHold, sendOffer, confirmBooked, rejectSubmission,
  setTapeAnalysis, moveToAvailCheck,
} from "@/lib/projects-store";
import { createApprovalSession } from "@/lib/approval-store";
import { addNotification } from "@/lib/notifications-store";

const SEED_FLAG = "castit_demo_seeded_v2";

export function isDemoSeeded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SEED_FLAG) === "1";
}

export function resetDemo(): void {
  if (typeof window === "undefined") return;
  // Clear everything relevant
  const keys = [
    "castit_projects_v2", "castit_roles_v3", "castit_submissions_v3",
    "castit_approval_sessions_v1", "castit_share_packets_v1",
    "castit_coach_scenes_v1", "castit_coach_takes_v1",
    SEED_FLAG,
  ];
  for (const k of keys) localStorage.removeItem(k);
  // Reload to trigger reseed
  window.location.href = "/welcome";
}

const HOURS = 3_600_000;
const DAYS = 86_400_000;

export function seedDemo(): void {
  if (typeof window === "undefined") return;
  if (isDemoSeeded()) return;
  if (loadProjects().length > 0) {
    // Already has real data — don't overwrite
    localStorage.setItem(SEED_FLAG, "1");
    return;
  }

  // ─── Project 1: Feature film, full casting ──────────
  const after = addProject({
    title: "After the Rain",
    studio: "Northwind Pictures",
    type: "Feature Film",
    status: "casting",
    posterColor: "#8B5A3C",
    description: "Drama set in a small fishing village. Returning daughter, estranged father, and the storm season closing in.",
    mode: "full",
  });

  const mayaRole = addRole({
    projectId: after.id,
    name: "Maya — Lead",
    description: "Female, 25-32, Mediterranean. Returns home after 8 years away. Controlled, watchful, breaks open in act 3.",
    sides: "INT. KITCHEN — NIGHT\n\nMAYA: I told you I'm not doing it.\nDAVID: It's not about you anymore.\nMAYA: It was never about me. That's the problem.",
    selfTapeInstructions: "Slate first. Vertical, well-lit. Two takes — one held back, one open.",
    deadline: new Date(Date.now() + 3 * DAYS).toISOString().slice(0, 10),
    shootDates: "Aug 12 – Sep 25",
    payRange: "$1.8-2.2K/day + travel",
  });

  const davidRole = addRole({
    projectId: after.id,
    name: "David — Father",
    description: "Male, 55-65. Quiet, weathered, carrying decades of regret. Hands matter.",
    sides: "INT. KITCHEN — NIGHT\n\nDAVID: It's not about you anymore.\nMAYA: It was never about me. That's the problem.",
    deadline: new Date(Date.now() + 5 * DAYS).toISOString().slice(0, 10),
    shootDates: "Aug 12 – Sep 25",
    payRange: "$1.5K/day",
  });

  // Maya submissions — varied pipeline stages
  const s_maya_t1 = inviteTalent(mayaRole.id,
    { id: TALENTS[0].id, name: TALENTS[0].name, photo: TALENTS[0].photo },
    { message: "Loved your reel — would love you to read for Maya.", deadline: mayaRole.deadline },
  );
  addTape(s_maya_t1.id, { note: "Submitted on time. Clean two-take read." });
  // Maya's callback is scheduled in-person, not yet completed (showcases new flow)
  moveToCallback(s_maya_t1.id, {
    message: "Strong submission. Let's bring you in for an in-person callback.",
    type: "in_person",
    scheduledAt: new Date(Date.now() + 2 * DAYS + 4 * HOURS).toISOString(),
    location: "Tagada Studios, Tel Aviv — Room 3",
  });
  setTapeAnalysis(s_maya_t1.id, 1, {
    slateComplete: true,
    linesAccuracy: 96,
    pacingNote: "Well-placed pause before 'that's the problem'",
    emotionalChoice: "Restraint over anger — exactly the brief asks for",
    strengths: ["Eye-line steady through the silence", "Specific choices on subtext"],
    concerns: ["Slate could be a beat tighter"],
    recommendation: "callback",
    summary: "Genuine internal life. Matches the role's restraint-over-explosion brief precisely.",
    generatedAt: new Date(Date.now() - 6 * HOURS).toISOString(),
  });

  const s_maya_t3 = inviteTalent(mayaRole.id,
    { id: TALENTS[2].id, name: TALENTS[2].name, photo: TALENTS[2].photo },
    { message: "Read for Maya?", deadline: mayaRole.deadline },
  );
  addTape(s_maya_t3.id, { note: "Round 1 tape — bold choice on opening line." });
  // leave at "submitted" — appears in Triage

  const s_maya_t5 = inviteTalent(mayaRole.id,
    { id: TALENTS[4].id, name: TALENTS[4].name, photo: TALENTS[4].photo },
    { message: "Heard from your agent — please record.", deadline: mayaRole.deadline },
  );
  addTape(s_maya_t5.id, { note: "Self-tape" });
  moveToHold(s_maya_t5.id, "Strong work — placing you on a 48h hold while we finalize.", 36);

  const s_maya_t6 = inviteTalent(mayaRole.id,
    { id: TALENTS[5].id, name: TALENTS[5].name, photo: TALENTS[5].photo },
    { deadline: new Date(Date.now() - 1 * DAYS).toISOString().slice(0, 10) },
  );
  // leave at "invited" — deadline_passed urgency

  // David submissions
  const s_david_t4 = inviteTalent(davidRole.id,
    { id: TALENTS[3].id, name: TALENTS[3].name, photo: TALENTS[3].photo },
    { message: "Would love you to read for David." },
  );
  addTape(s_david_t4.id, { note: "Beautifully understated read." });
  // David's callback was scheduled in-person AND completed → unblocks avail check
  moveToCallback(s_david_t4.id, {
    message: "We loved this. Callback?",
    type: "in_person",
    scheduledAt: new Date(Date.now() - 1 * DAYS).toISOString(),
    location: "Northwind Office",
  });
  markCallbackDone(s_david_t4.id, "Great chemistry with the energy. Confident in the role.");
  addTape(s_david_t4.id, { note: "Round 2 — even better. Adjustments landed." });
  moveToAvailCheck(s_david_t4.id, "Aug 12 – Sep 25", "Checking your availability for the shoot window.");

  const s_david_t2 = inviteTalent(davidRole.id,
    { id: TALENTS[1].id, name: TALENTS[1].name, photo: TALENTS[1].photo },
  );
  addTape(s_david_t2.id, { note: "Initial read" });
  rejectSubmission(s_david_t2.id, "Thank you — we've gone in a different direction.");

  // ─── Project 2: TV Series, full casting ─────────────
  const wave = addProject({
    title: "The Wave Below",
    studio: "Plume Studios",
    type: "TV Series",
    status: "callbacks",
    posterColor: "#3C5A8B",
    description: "8-episode psychological thriller. Three timelines, one apartment, one secret.",
    mode: "full",
  });

  const detRole = addRole({
    projectId: wave.id,
    name: "Detective Ben",
    description: "Male, 40-50. Methodical, controlled. Carries a quiet limp from an old injury.",
    sides: "INT. INTERROGATION ROOM\n\nBEN: I'm not asking again.\nSUSPECT: Then don't.",
    shootDates: "Oct 1 – Dec 15",
    payRange: "Series rate",
  });

  const s_ben_t4 = inviteTalent(detRole.id,
    { id: TALENTS[3].id, name: TALENTS[3].name, photo: TALENTS[3].photo },
  );
  addTape(s_ben_t4.id, { note: "Round 1" });
  // Ben's callback was a tape callback that has been completed → moved to offer
  moveToCallback(s_ben_t4.id, { type: "tape", message: "New sides attached — send a callback tape." });
  addTape(s_ben_t4.id, { note: "Round 2 callback — sharper" }); // auto-completes the tape callback
  sendOffer(s_ben_t4.id, "$2.5K/episode × 8 + back-end", "Formal offer on the table. Looking forward to making this official.");

  const s_ben_t6 = inviteTalent(detRole.id,
    { id: TALENTS[5].id, name: TALENTS[5].name, photo: TALENTS[5].photo },
  );
  addTape(s_ben_t6.id, { note: "Strong round 1" });
  moveToHold(s_ben_t6.id, "Holding while we sort offers.", 18); // hold_expiring within 24h

  // ─── Project 3: Commercial, QUICK CAST ──────────────
  const aroma = addProject({
    title: "Aroma — Summer Spot",
    studio: "Tagada Agency",
    type: "Commercial",
    status: "casting",
    posterColor: "#5C7548",
    description: "60-second spot. Beach café, three friends, golden-hour magic.",
    mode: "quick",
  });

  const friendsRole = addRole({
    projectId: aroma.id,
    name: "Friend Group (3 types)",
    description: "20-35, varied looks. Background/non-speaking but featured.",
    shootDates: "Jun 10-12",
    payRange: "₪800/day",
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
    roleName: "Maya — Lead",
    tapeBlobKey: undefined,
    tapeUrl: undefined,
  }));

  createApprovalSession({
    proName: "Casting Director",
    projectTitle: after.title,
    roleName: "Maya — Lead",
    greeting: "Hey — top 2 for Maya. Tag your gut: Yes / Maybe / No. I'll see it sync in real-time.",
    talents: callbackSubs,
    expiresAt: new Date(Date.now() + 14 * DAYS).toISOString(),
  });

  // ─── Seed Notifications ─────────────────────────────
  // Talent-facing
  addNotification({
    audience: "talent",
    kind: "callback",
    title: "🎉 Callback ל-Maya",
    body: "Northwind Pictures רוצה אותך לסיבוב הבא של After the Rain",
    href: "/inbox",
  });
  addNotification({
    audience: "talent",
    kind: "invite",
    title: "הזמנה חדשה: Detective Ben",
    body: "Plume Studios — קרא לתפקיד ב-The Wave Below",
    href: "/inbox",
  });
  addNotification({
    audience: "talent",
    kind: "casting",
    title: "התאמת קסטינג חדשה",
    body: "תפקיד חדש שמתאים לפרופיל שלך — Lead Female 25-32",
    href: "/auditions",
  });
  addNotification({
    audience: "talent",
    kind: "like",
    title: "Daniel Cohen אהב את הריל שלך",
    body: "Monologue from 'A Streetcar Named Desire'",
    href: "/feed",
  });

  // Pro-facing
  addNotification({
    audience: "pro",
    kind: "tape_in",
    title: "טייפ חדש מ-Noa Yadid",
    body: `עבור Maya — Lead. Aria ניתחה: ${"recommended callback"}`,
    href: `/pro/projects/${after.id}/role/${mayaRole.id}/submission/${s_maya_t3.id}`,
  });
  addNotification({
    audience: "pro",
    kind: "hold",
    title: "Hold עומד לפוג: Shiran Mor",
    body: "Maya — Lead · נשארו 12 שעות, החליטי בהקדם",
    href: `/pro/projects/${after.id}/role/${mayaRole.id}/submission/${s_maya_t5.id}`,
  });
  addNotification({
    audience: "pro",
    kind: "vote",
    title: "המפיק הצביע 👍 על Maya Levi",
    body: "Director Review של After the Rain — 1/2 הצביעו",
    href: "/pro/approvals",
  });

  // Done
  localStorage.setItem(SEED_FLAG, "1");
}
