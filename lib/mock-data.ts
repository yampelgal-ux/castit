export type BodyType = "Slim" | "Athletic" | "Average" | "Curvy" | "Muscular" | "Plus-size";
export type VoiceType = "Soprano" | "Mezzo" | "Alto" | "Tenor" | "Baritone" | "Bass" | "Spoken only";
export type UnionStatus = "Union" | "Non-union" | "Eligible";
export type ExperienceLevel = "Beginner" | "Emerging" | "Established" | "Veteran";

export type Talent = {
  id: string;
  username: string;
  name: string;
  verified: boolean;
  photo: string;
  cover: string;
  bio: string;
  followers: number;
  likes: number;
  submissions: number;
  typecast: {
    // Physical
    heightCm: number;
    weightKg: number;
    ageRange: [number, number];
    gender: "Male" | "Female" | "Non-binary";
    ethnicity: string;
    skinTone: string;
    eyeColor: string;
    hairColor: string;
    hairLength: "Short" | "Medium" | "Long";
    bodyType?: BodyType;
    features?: string[]; // tattoos, piercings, freckles, scars, glasses, beard…

    // Performance
    languages: string[];
    accents?: string[]; // British, RP, American Southern, Mizrahi, Russian…
    voiceType?: VoiceType;
    skills: string[];
    genres: string[];

    // Career
    unionStatus?: UnionStatus;
    experienceLevel?: ExperienceLevel;
    location?: string;
    willingToTravel?: boolean;
  };
};

export type ReelPost = {
  id: string;
  talentId: string;
  videoUrl: string;
  poster: string;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
};

export type DailyTask = {
  id: string;
  title: string;
  description: string;
  category: "Monologue" | "Improv" | "Movement" | "Voice";
  daysLeft: number;
  reward: string;
  participants: number;
};

export type Casting = {
  id: string;
  title: string;
  studio: string;
  studioLogo: string;
  type: "Feature Film" | "TV Series" | "Commercial" | "Short Film" | "Music Video";
  location: string;
  paid: boolean;
  deadline: string;
  description: string;
  requirements: {
    gender?: string[];
    ageRange?: [number, number];
    languages?: string[];
    skills?: string[];
  };
  applicants: number;
};

export type StarRanking = {
  rank: number;
  talentId: string;
  category: "Drama" | "Comedy" | "Action" | "Modeling";
  weeklyLikes: number;
  growth: number;
};

export type Scene = {
  id: string;
  title: string;
  source: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  thumbnail: string;
  characters: { name: string; lines: string[] }[];
};

export type AgentMessage = {
  from: "agent" | "user";
  text: string;
  time: string;
};

export type Negotiation = {
  id: string;
  project: string;
  studio: string;
  status: "Negotiating" | "Scheduling" | "Closed" | "Pending response";
  proposedDate?: string;
  fee?: string;
};

const UNSPLASH = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const TALENTS: Talent[] = [
  {
    id: "t1",
    username: "mayalevi",
    name: "Maya Levi",
    verified: true,
    photo: UNSPLASH("1488426862026-3ee34a7d66df", 600),
    cover: UNSPLASH("1517841905240-472988babdf9", 1200),
    bio: "Theatre-trained. Drama & dark comedy. Tel Aviv ↔ NYC.",
    followers: 48200,
    likes: 312000,
    submissions: 27,
    typecast: {
      heightCm: 172,
      weightKg: 58,
      ageRange: [22, 30],
      gender: "Female",
      ethnicity: "Mediterranean",
      skinTone: "#E4B58F",
      eyeColor: "#5B7C8A",
      hairColor: "#3B2A1E",
      hairLength: "Long",
      languages: ["Hebrew", "English", "French"],
      accents: ["Parisian French", "American Standard"],
      voiceType: "Mezzo",
      skills: ["Stage Combat", "Piano", "Horseback Riding"],
      genres: ["Drama", "Thriller", "Indie"],
      bodyType: "Slim",
      features: ["Freckles"],
      unionStatus: "Union",
      experienceLevel: "Established",
      location: "Tel Aviv",
      willingToTravel: true,
    },
  },
  {
    id: "t2",
    username: "danielcohen",
    name: "Daniel Cohen",
    verified: true,
    photo: UNSPLASH("1500648767791-00dcc994a43e", 600),
    cover: UNSPLASH("1492691527719-9d1e07e534b4", 1200),
    bio: "Action & period drama. Trained in Krav Maga and dialects.",
    followers: 91300,
    likes: 740000,
    submissions: 54,
    typecast: {
      heightCm: 186,
      weightKg: 82,
      ageRange: [28, 38],
      gender: "Male",
      ethnicity: "Mixed European",
      skinTone: "#D2A580",
      eyeColor: "#3D4F2C",
      hairColor: "#1C1410",
      hairLength: "Short",
      languages: ["English", "Hebrew", "Russian"],
      accents: ["British RP", "Russian", "American Standard"],
      voiceType: "Baritone",
      skills: ["Krav Maga", "Horseback Riding", "Motorcycle", "Dialects"],
      genres: ["Action", "Period Drama", "Thriller"],
      bodyType: "Muscular",
      features: ["Beard", "Scar (eyebrow)"],
      unionStatus: "Union",
      experienceLevel: "Veteran",
      location: "Tel Aviv",
      willingToTravel: true,
    },
  },
  {
    id: "t3",
    username: "noayadid",
    name: "Noa Yadid",
    verified: false,
    photo: UNSPLASH("1534528741775-53994a69daeb", 600),
    cover: UNSPLASH("1469474968028-56623f02e42e", 1200),
    bio: "Comedy, voice work, and musical theatre.",
    followers: 12700,
    likes: 88000,
    submissions: 11,
    typecast: {
      heightCm: 165,
      weightKg: 54,
      ageRange: [19, 27],
      gender: "Female",
      ethnicity: "Ashkenazi",
      skinTone: "#F2D2B3",
      eyeColor: "#6B8E4E",
      hairColor: "#8B5A2B",
      hairLength: "Medium",
      languages: ["Hebrew", "English"],
      accents: ["American Standard", "Brooklyn"],
      voiceType: "Soprano",
      skills: ["Singing (Mezzo)", "Improv", "Tap Dance"],
      genres: ["Comedy", "Musical", "Romance"],
      bodyType: "Average",
      features: ["Freckles", "Glasses"],
      unionStatus: "Non-union",
      experienceLevel: "Emerging",
      location: "Tel Aviv",
      willingToTravel: false,
    },
  },
  {
    id: "t4",
    username: "amirzeev",
    name: "Amir Zeev",
    verified: true,
    photo: UNSPLASH("1507003211169-0a1dd7228f2d", 600),
    cover: UNSPLASH("1517816743773-6e0fd518b4a6", 1200),
    bio: "Indie film & character work. Based in Berlin.",
    followers: 32100,
    likes: 215000,
    submissions: 19,
    typecast: {
      heightCm: 178,
      weightKg: 71,
      ageRange: [30, 42],
      gender: "Male",
      ethnicity: "Middle Eastern",
      skinTone: "#A8754E",
      eyeColor: "#3A2614",
      hairColor: "#0D0908",
      hairLength: "Medium",
      languages: ["English", "Hebrew", "German", "Arabic"],
      accents: ["German", "Arabic", "British RP"],
      voiceType: "Tenor",
      skills: ["Method Acting", "Guitar", "Boxing"],
      genres: ["Indie", "Drama", "Arthouse"],
      bodyType: "Athletic",
      features: ["Beard", "Tattoos (sleeve)"],
      unionStatus: "Eligible",
      experienceLevel: "Established",
      location: "Berlin",
      willingToTravel: true,
    },
  },
  {
    id: "t5",
    username: "shiranmor",
    name: "Shiran Mor",
    verified: true,
    photo: UNSPLASH("1531746020798-e6953c6e8e04", 600),
    cover: UNSPLASH("1502920917128-1aa500764cbd", 1200),
    bio: "Modeling & on-camera commercial work.",
    followers: 156000,
    likes: 1240000,
    submissions: 42,
    typecast: {
      heightCm: 179,
      weightKg: 60,
      ageRange: [21, 29],
      gender: "Female",
      ethnicity: "Mixed",
      skinTone: "#C99876",
      eyeColor: "#8B6F47",
      hairColor: "#2A1810",
      hairLength: "Long",
      languages: ["English", "Hebrew", "Spanish"],
      accents: ["American Standard", "Spanish"],
      voiceType: "Alto",
      skills: ["Runway", "Yoga", "Surfing"],
      genres: ["Commercial", "Fashion", "Music Video"],
      bodyType: "Slim",
      features: ["Tattoo (small wrist)"],
      unionStatus: "Non-union",
      experienceLevel: "Established",
      location: "Tel Aviv",
      willingToTravel: true,
    },
  },
  {
    id: "t6",
    username: "yonatan",
    name: "Yonatan Bar",
    verified: false,
    photo: UNSPLASH("1492562080023-ab3db95bfbce", 600),
    cover: UNSPLASH("1485846234645-a62644f84728", 1200),
    bio: "Young leading man. Comedy & coming-of-age.",
    followers: 8400,
    likes: 51000,
    submissions: 6,
    typecast: {
      heightCm: 181,
      weightKg: 74,
      ageRange: [18, 25],
      gender: "Male",
      ethnicity: "European",
      skinTone: "#EBC8A7",
      eyeColor: "#4A6FA5",
      hairColor: "#D4A574",
      hairLength: "Short",
      languages: ["Hebrew", "English"],
      accents: ["American Standard"],
      voiceType: "Tenor",
      skills: ["Skateboarding", "Surfing", "Improv"],
      genres: ["Comedy", "Romance", "Coming-of-age"],
      bodyType: "Athletic",
      features: [],
      unionStatus: "Non-union",
      experienceLevel: "Beginner",
      location: "Haifa",
      willingToTravel: true,
    },
  },
];

// ── Audition (Casting Pro posts → public talent feed) ────────────────────
export type Audition = {
  id: string;
  postedBy: string;          // pro user id
  studio: string;
  title: string;
  type: "Feature Film" | "TV Series" | "Commercial" | "Short Film" | "Music Video" | "Theatre" | "Voice-over";
  location: string;
  paid: boolean;
  fee?: string;
  deadline: string;          // ISO or "Jun 03"
  shootDates?: string;
  description: string;
  selfTapeInstructions?: string;
  targetTypecast: {
    gender?: string[];
    ageRange?: [number, number];
    heightRange?: [number, number];
    ethnicities?: string[];
    bodyTypes?: BodyType[];
    hairColors?: string[];
    hairLengths?: ("Short" | "Medium" | "Long")[];
    eyeColors?: string[];
    skinTones?: string[];
    languages?: string[];
    accents?: string[];
    voiceTypes?: VoiceType[];
    skills?: string[];
    unionStatus?: UnionStatus[];
    experienceLevels?: ExperienceLevel[];
    locations?: string[];
    mustTravel?: boolean;
  };
  applicants: number;
  createdAt: string;
};

export const REELS: ReelPost[] = [
  {
    id: "r1",
    talentId: "t1",
    videoUrl: "https://assets.mixkit.co/videos/4434/4434-720.mp4",
    poster: UNSPLASH("1485846234645-a62644f84728", 800),
    caption: "Monologue from 'A Streetcar Named Desire' — Blanche, scene 11",
    likes: 12400,
    comments: 312,
    shares: 89,
  },
  {
    id: "r2",
    talentId: "t2",
    videoUrl: "https://assets.mixkit.co/videos/39767/39767-720.mp4",
    poster: UNSPLASH("1492691527719-9d1e07e534b4", 800),
    caption: "Stage combat reel — long sword choreography",
    likes: 28100,
    comments: 540,
    shares: 210,
  },
  {
    id: "r3",
    talentId: "t3",
    videoUrl: "https://assets.mixkit.co/videos/51564/51564-720.mp4",
    poster: UNSPLASH("1469474968028-56623f02e42e", 800),
    caption: "Improv challenge — 'one-word story' in 60 seconds 😅",
    likes: 7200,
    comments: 188,
    shares: 41,
  },
  {
    id: "r4",
    talentId: "t5",
    videoUrl: "https://assets.mixkit.co/videos/4937/4937-720.mp4",
    poster: UNSPLASH("1502920917128-1aa500764cbd", 800),
    caption: "Latest editorial campaign — golden hour ✨",
    likes: 54300,
    comments: 902,
    shares: 412,
  },
  {
    id: "r5",
    talentId: "t4",
    videoUrl: "https://assets.mixkit.co/videos/4448/4448-720.mp4",
    poster: UNSPLASH("1517816743773-6e0fd518b4a6", 800),
    caption: "Scene study — quiet rage. Method workshop, Berlin.",
    likes: 9800,
    comments: 221,
    shares: 67,
  },
];

export const DAILY_TASKS: DailyTask[] = [
  {
    id: "d1",
    title: "30-Second Monologue",
    description: "Record a 30s monologue from any classic film. Tag #DailyMono",
    category: "Monologue",
    daysLeft: 2,
    reward: "Featured on Discover for 24h",
    participants: 1240,
  },
  {
    id: "d2",
    title: "Emotion in 5 Seconds",
    description: "Show 5 distinct emotions in 5 seconds — no words allowed.",
    category: "Improv",
    daysLeft: 4,
    reward: "+500 visibility boost",
    participants: 892,
  },
  {
    id: "d3",
    title: "Accent Switch",
    description: "Read the same paragraph in 3 different accents.",
    category: "Voice",
    daysLeft: 1,
    reward: "Shortlist for voice-over agency",
    participants: 2103,
  },
  {
    id: "d4",
    title: "Silent Scene",
    description: "Tell a 60-second story using only body language.",
    category: "Movement",
    daysLeft: 6,
    reward: "Movement workshop scholarship",
    participants: 514,
  },
];

export const CASTINGS: Casting[] = [
  {
    id: "c1",
    title: "Lead — 'After the Rain' (Feature)",
    studio: "Northwind Pictures",
    studioLogo: UNSPLASH("1611162617213-7d7a39e9b1d7", 200),
    type: "Feature Film",
    location: "Tel Aviv + Sofia",
    paid: true,
    deadline: "May 28",
    description: "Searching for a female lead, 25-32, fluent in Hebrew & English. Drama with thriller elements. 6-week shoot.",
    requirements: {
      gender: ["Female"],
      ageRange: [25, 32],
      languages: ["Hebrew", "English"],
      skills: ["Drama"],
    },
    applicants: 187,
  },
  {
    id: "c2",
    title: "Supporting — Netflix Limited Series",
    studio: "Yes Studios",
    studioLogo: UNSPLASH("1611162616475-46b635cb6868", 200),
    type: "TV Series",
    location: "Jerusalem",
    paid: true,
    deadline: "Jun 03",
    description: "Period drama set in the 1970s. Casting 3 supporting roles. Strong character actors preferred.",
    requirements: {
      ageRange: [28, 55],
      languages: ["Hebrew"],
    },
    applicants: 412,
  },
  {
    id: "c3",
    title: "Lead Male — Sports Commercial",
    studio: "Adidas IL",
    studioLogo: UNSPLASH("1556906781-9a412961c28c", 200),
    type: "Commercial",
    location: "Eilat (2 days)",
    paid: true,
    deadline: "May 22",
    description: "Athletic build, 22-30. Surfing or skateboarding skills a strong plus. Day rate + usage.",
    requirements: {
      gender: ["Male"],
      ageRange: [22, 30],
      skills: ["Surfing", "Skateboarding"],
    },
    applicants: 96,
  },
  {
    id: "c4",
    title: "Music Video — Indie Artist",
    studio: "Strand Films",
    studioLogo: UNSPLASH("1611162618071-b39a2ec055fb", 200),
    type: "Music Video",
    location: "Haifa",
    paid: false,
    deadline: "May 25",
    description: "Looking for expressive faces. Non-speaking. Mood: melancholic, dreamy.",
    requirements: {
      ageRange: [18, 35],
    },
    applicants: 230,
  },
];

export const STARS_OF_WEEK: StarRanking[] = [
  { rank: 1, talentId: "t5", category: "Modeling", weeklyLikes: 124000, growth: 32 },
  { rank: 2, talentId: "t2", category: "Action", weeklyLikes: 89200, growth: 18 },
  { rank: 3, talentId: "t1", category: "Drama", weeklyLikes: 71400, growth: 24 },
  { rank: 4, talentId: "t4", category: "Drama", weeklyLikes: 42100, growth: 9 },
  { rank: 5, talentId: "t3", category: "Comedy", weeklyLikes: 31800, growth: 41 },
  { rank: 6, talentId: "t6", category: "Comedy", weeklyLikes: 18400, growth: 56 },
];

export const SCENES: Scene[] = [
  {
    id: "s1",
    title: "The Breakup",
    source: "Marriage Story (2019)",
    difficulty: "Advanced",
    duration: "4:20",
    thumbnail: UNSPLASH("1485846234645-a62644f84728", 600),
    characters: [
      { name: "Charlie", lines: ["You hated being married.", "I never said that.", "Then why are you doing this?"] },
      { name: "Nicole", lines: ["I needed to become someone else.", "I'm sorry I can't be that for you.", "I think we should stop."] },
    ],
  },
  {
    id: "s2",
    title: "Diner Confession",
    source: "Heat (1995)",
    difficulty: "Intermediate",
    duration: "3:10",
    thumbnail: UNSPLASH("1517816743773-6e0fd518b4a6", 600),
    characters: [
      { name: "Vincent", lines: ["You know, we're sitting here, you and I.", "Like a couple of regular fellas.", "But if it's between you and some poor bastard..."] },
      { name: "Neil", lines: ["I'm alone, I am not lonely.", "You stay on a guy long enough, you get to know him.", "There's a flip side to that coin."] },
    ],
  },
  {
    id: "s3",
    title: "Garden Bench",
    source: "Good Will Hunting (1997)",
    difficulty: "Intermediate",
    duration: "2:45",
    thumbnail: UNSPLASH("1502920917128-1aa500764cbd", 600),
    characters: [
      { name: "Sean", lines: ["So if I asked you about art, you'd probably give me the skinny on every art book ever written.", "But I bet you can't tell me what it smells like in the Sistine Chapel.", "You don't know real loss."] },
    ],
  },
];

export const AGENT_CHAT: AgentMessage[] = [
  { from: "agent", text: "Morning ☀️ Three updates: Northwind sent a callback for tomorrow 10:30. Adidas wants your reel by Friday. I drafted a polite pass on the music video — too low budget, conflicts with the Northwind dates. Approve?", time: "08:14" },
  { from: "user", text: "Approve the pass. Push Northwind to 11:00 — I'm coaching at 9.", time: "08:16" },
  { from: "agent", text: "Done. Northwind confirmed 11:00, added to your calendar. I'll send the Adidas reel today and start prepping callback sides for you to review tonight.", time: "08:17" },
  { from: "user", text: "Perfect. Any new opportunities worth my time?", time: "08:18" },
  { from: "agent", text: "One. Limited series, lead support, paid well. Fits your typecast 89%. I'll keep watching — won't bother you unless something hits 90+.", time: "08:18" },
];

export const NEGOTIATIONS: Negotiation[] = [
  { id: "n1", project: "After the Rain (Lead)", studio: "Northwind Pictures", status: "Scheduling", proposedDate: "May 17, 11:00", fee: "Negotiating $4.5K/day" },
  { id: "n2", project: "Adidas Commercial", studio: "Adidas IL", status: "Pending response", fee: "$3.2K + usage" },
  { id: "n3", project: "Indie MV — pass draft", studio: "Strand Films", status: "Closed" },
];
