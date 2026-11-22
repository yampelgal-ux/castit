// Turn raw Supabase / network errors into short, human messages (Hebrew or English).
type L = (he: string, en: string) => string;

export function friendlyAuthError(err: unknown, L: L): string {
  const msg = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err ?? "");
  if (/failed to fetch|fetch failed|networkerror|network request failed|load failed|ERR_NAME_NOT_RESOLVED|AuthRetryableFetchError/i.test(msg) || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    return typeof navigator !== "undefined" && navigator.onLine === false
      ? L("אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.", "You're offline. Check your connection and try again.")
      : L("השרת לא זמין כרגע. נסו שוב בעוד כמה דקות.", "The server isn't reachable right now. Try again in a few minutes.");
  }
  if (/email not confirmed|confirm/i.test(msg)) return L("צריך לאשר את המייל קודם. בדקו את תיבת הדואר.", "Please confirm your email first. Check your inbox.");
  if (/invalid login|credentials/i.test(msg)) return L("המייל או הסיסמה לא נכונים.", "Wrong email or password.");
  if (/already registered|already exists/i.test(msg)) return L("כבר יש חשבון עם המייל הזה. אפשר להתחבר.", "An account with this email already exists. Sign in instead.");
  if (/rate limit|too many|security purposes/i.test(msg)) return L("יותר מדי ניסיונות. חכו דקה ונסו שוב.", "Too many attempts. Wait a minute and try again.");
  if (/password/i.test(msg)) return L("הסיסמה חלשה מדי. נסו לפחות 6 תווים.", "Password is too weak. Use at least 6 characters.");
  if (/email/i.test(msg) && /invalid|valid/i.test(msg)) return L("כתובת המייל לא תקינה.", "That email address isn't valid.");
  return msg || L("משהו השתבש. נסו שוב.", "Something went wrong. Try again.");
}

/** Why a video didn't reach the cloud, in words (reason from lastUploadError()). */
export function uploadErrorText(why: string, L: L): string {
  if (why === "signed-out") return L("צריך להתחבר לחשבון כדי שהסרטון יעלה לענן.", "Sign in so the video can upload to the cloud.");
  if (why === "too-large") return L("הסרטון גדול מדי (מעל 50MB). כדאי לקצר אותו או לייצא באיכות נמוכה יותר.", "The video is too big (over 50MB). Trim it or export at a lower quality.");
  if (why === "network") return L("החיבור לאינטרנט נפל באמצע ההעלאה. בדקו את החיבור ונסו שוב.", "The connection dropped during the upload. Check your connection and try again.");
  if (why === "not-allowed") return L("אין הרשאה להעלות כרגע. נסו להתנתק ולהתחבר שוב.", "Upload not allowed right now. Try signing out and back in.");
  return L("ההעלאה לענן לא הצליחה. נסו שוב בעוד רגע.", "The cloud upload didn't go through. Try again in a moment.");
}
