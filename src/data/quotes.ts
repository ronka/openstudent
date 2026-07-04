/**
 * Short Hebrew study-motivation lines shown at the top of the dashboard.
 * `randomQuote()` is used with a `useState` initializer so the line stays
 * stable for a mount but rerolls on the next app launch.
 */

export const MOTIVATIONAL_QUOTES: string[] = [
  'כל דף שאתה קורא מקרב אותך למטרה',
  'התקדמות קטנה כל יום מצטברת לתואר',
  'הדרך היחידה לסיים היא להתחיל',
  'אתה מסוגל ליותר ממה שנדמה לך',
  'משמעת עכשיו, חופש אחר כך',
  'אל תשווה את הפרק הראשון שלך לפרק העשירי של מישהו אחר',
  'עשרים וחמש דקות של ריכוז שוות יותר משעה של הסחות',
  'הצלחה היא סכום של מאמצים קטנים שחוזרים על עצמם',
  'המבחן הקשה של אתמול הוא הידע של מחר',
  'תתחיל לפני שאתה מרגיש מוכן',
  'כל מומחה היה פעם מתחיל',
  'העתיד שלך נבנה ממה שאתה עושה היום',
];

export function randomQuote(): string {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}
