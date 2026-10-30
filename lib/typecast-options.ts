// Option lists shared by the talent's typecast form and the casting search
// filters, so whatever a talent can pick, a casting director can filter by.
// Values are stored in English; `heLabel` gives the Hebrew label.

import type { BodyType, VoiceType, UnionStatus, ExperienceLevel } from "./mock-data";

export const GENDERS = ["Female", "Male", "Non-binary"] as const;
export const BODY: BodyType[] = ["Slim", "Athletic", "Average", "Curvy", "Muscular", "Plus-size"];
export const HAIR_LENGTHS = ["Short", "Medium", "Long"] as const;
export const HAIR_TYPES = ["Straight", "Wavy", "Curly", "Coily", "Shaved / Bald"] as const;
export const FACIAL_HAIR = ["None", "Stubble", "Beard", "Mustache", "Goatee"] as const;
export const ETHNICITIES = ["Ashkenazi", "Mizrahi", "Sephardi", "Ethiopian", "Arab", "Druze", "Russian / FSU", "European", "Mediterranean", "Middle Eastern", "African", "Asian", "Latinx", "Mixed"];
export const FEATURES = ["Tattoos", "Piercings", "Freckles", "Glasses", "Scars", "Dimples", "Birthmark", "Gap teeth", "Braces", "Very long hair", "Dreadlocks", "Twin"];
export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const VOICE: VoiceType[] = ["Soprano", "Mezzo", "Alto", "Tenor", "Baritone", "Bass", "Spoken only"];
export const UNION: UnionStatus[] = ["Union", "Non-union", "Eligible"];
export const LEVELS: ExperienceLevel[] = ["Beginner", "Emerging", "Established", "Veteran"];
export const LANGUAGES = ["Hebrew", "English", "Arabic", "Russian", "French", "Spanish", "German", "Italian", "Amharic", "Yiddish", "Portuguese", "Hungarian"];
export const ACCENTS = ["Native Israeli", "Mizrahi", "Russian", "Arabic", "French", "American Standard", "American Southern", "British RP", "Brooklyn", "German", "Spanish", "Parisian French"];
export const SKILL_GROUPS: { id: string; en: string; he: string; options: string[] }[] = [
  { id: "acting", en: "Acting", he: "משחק", options: ["Improv", "Method Acting", "Comedy", "Stage Combat", "Dialects", "Voice Over", "Puppetry", "Clown"] },
  { id: "music", en: "Music", he: "מוזיקה", options: ["Singing", "Rap", "Piano", "Guitar", "Drums", "Violin", "Saxophone", "DJ"] },
  { id: "dance", en: "Dance", he: "ריקוד", options: ["Dance", "Ballet", "Hip-hop", "Contemporary", "Tap Dance", "Salsa", "Belly Dance", "Folk Dance"] },
  { id: "sport", en: "Sport & action", he: "ספורט ואקשן", options: ["Martial Arts", "Krav Maga", "Boxing", "Swimming", "Surfing", "Skateboarding", "Horseback Riding", "Gymnastics", "Yoga", "Running", "Football", "Basketball"] },
  { id: "other", en: "Other", he: "אחר", options: ["Driving (Stick)", "Motorcycle", "Runway", "Juggling", "Magic", "Sign Language", "Firearms training", "Cooking"] },
];
export const SKILLS = SKILL_GROUPS.flatMap((g) => g.options);
export const GENRES = ["Drama", "Comedy", "Thriller", "Action", "Romance", "Indie", "Period", "Horror", "Musical", "Commercial", "Kids", "Theater", "Music Video"];
export const LOCATIONS = ["Tel Aviv", "Jerusalem", "Haifa", "Be'er Sheva", "Center", "North", "South", "Eilat", "Abroad"];
export const WORK_PERMITS = ["Israel", "EU", "USA", "UK"];

const HE: Record<string, string> = {
  Female: "אישה", Male: "גבר", "Non-binary": "א-בינארי",
  Slim: "רזה", Athletic: "אתלטי", Average: "ממוצע", Curvy: "מלא בעקומות", Muscular: "שרירי", "Plus-size": "מידות גדולות",
  Short: "קצר", Medium: "בינוני", Long: "ארוך",
  Straight: "חלק", Wavy: "גלי", Curly: "מתולתל", Coily: "תלתלים צפופים", "Shaved / Bald": "מגולח / קירח",
  None: "בלי", Stubble: "זיפים", Beard: "זקן", Mustache: "שפם", Goatee: "זקנקן",
  Ashkenazi: "אשכנזי", Mizrahi: "מזרחי", Sephardi: "ספרדי", Ethiopian: "אתיופי", Arab: "ערבי", Druze: "דרוזי",
  "Russian / FSU": "רוסי / חבר העמים", European: "אירופאי", Mediterranean: "ים תיכוני", "Middle Eastern": "מזרח תיכוני",
  African: "אפריקאי", Asian: "אסייתי", Latinx: "לטיני", Mixed: "מעורב",
  Tattoos: "קעקועים", Piercings: "פירסינג", Freckles: "נמשים", Glasses: "משקפיים", Scars: "צלקות", Dimples: "גומות חן",
  Birthmark: "כתם לידה", "Gap teeth": "רווח בין השיניים", Braces: "גשר בשיניים", "Very long hair": "שיער ארוך מאוד", Dreadlocks: "ראסטות", Twin: "יש לי תאום/ה",
  Soprano: "סופרן", Mezzo: "מצו", Alto: "אלט", Tenor: "טנור", Baritone: "בריטון", Bass: "בס", "Spoken only": "דיבור בלבד",
  Union: "חבר/ת איגוד", "Non-union": "לא באיגוד", Eligible: "זכאי/ת לאיגוד",
  Beginner: "מתחיל/ה", Emerging: "בתחילת הדרך", Established: "מנוסה", Veteran: "ותיק/ה",
  Hebrew: "עברית", English: "אנגלית", Arabic: "ערבית", Russian: "רוסית", French: "צרפתית", Spanish: "ספרדית", German: "גרמנית",
  Italian: "איטלקית", Amharic: "אמהרית", Yiddish: "יידיש", Portuguese: "פורטוגזית", Hungarian: "הונגרית",
  "Native Israeli": "ישראלי", "American Standard": "אמריקאי", "American Southern": "אמריקאי דרומי", "British RP": "בריטי",
  Brooklyn: "ברוקלין", "Parisian French": "צרפתי פריזאי",
  Improv: "אימפרוביזציה", "Method Acting": "משחק בשיטה", Comedy: "קומדיה", "Stage Combat": "קרב במה", Dialects: "דיאלקטים",
  "Voice Over": "דיבוב", Puppetry: "בובנאות", Clown: "ליצנות",
  Singing: "שירה", Rap: "ראפ", Piano: "פסנתר", Guitar: "גיטרה", Drums: "תופים", Violin: "כינור", Saxophone: "סקסופון", DJ: "תקלוט",
  Dance: "ריקוד", Ballet: "בלט", "Hip-hop": "היפ הופ", Contemporary: "מחול עכשווי", "Tap Dance": "סטפס", Salsa: "סלסה",
  "Belly Dance": "ריקוד בטן", "Folk Dance": "ריקודי עם",
  "Martial Arts": "אומנויות לחימה", "Krav Maga": "קרב מגע", Boxing: "איגרוף", Swimming: "שחייה", Surfing: "גלישה",
  Skateboarding: "סקייטבורד", "Horseback Riding": "רכיבה על סוסים", Gymnastics: "התעמלות", Yoga: "יוגה", Running: "ריצה",
  Football: "כדורגל", Basketball: "כדורסל",
  "Driving (Stick)": "נהיגה ידנית", Motorcycle: "אופנוע", Runway: "דוגמנות מסלול", Juggling: "ג׳אגלינג", Magic: "קוסמות",
  "Sign Language": "שפת סימנים", "Firearms training": "הכשרה בנשק", Cooking: "בישול",
  Drama: "דרמה", Thriller: "מותחן", Action: "אקשן", Romance: "רומנטיקה", Indie: "אינדי", Period: "תקופתי", Horror: "אימה",
  Musical: "מחזמר", Commercial: "פרסומות", Kids: "ילדים", Theater: "תיאטרון", "Music Video": "קליפים",
  "Tel Aviv": "תל אביב", Jerusalem: "ירושלים", Haifa: "חיפה", "Be'er Sheva": "באר שבע", Center: "מרכז", North: "צפון",
  South: "דרום", Eilat: "אילת", Abroad: "חו״ל",
  Israel: "ישראל", EU: "אירופה", USA: "ארה״ב", UK: "בריטניה",
  "Feature Film": "סרט קולנוע", "TV Series": "סדרת טלוויזיה", "Short Film": "סרט קצר", Theatre: "תיאטרון", "Voice-over": "דיבוב",
  "Student Film": "סרט סטודנטים", Web: "רשת", "Web Series": "סדרת רשת", Modeling: "דוגמנות", Other: "אחר",
};

export function heLabel(v: string): string {
  return HE[v] ?? v;
}

export function optLabel(v: string, he: boolean): string {
  return he ? heLabel(v) : v;
}
