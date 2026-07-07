import { db } from './client';
import { studyGroupLinks } from './schema';

const SEED_LINKS: (typeof studyGroupLinks.$inferInsert)[] = [
  { courseNumber: '20441', year: 2025, semester: 'א', platform: 'whatsapp', url: 'https://chat.whatsapp.com/JavaIntro2025A' },
  { courseNumber: '20441', year: 2025, semester: 'א', platform: 'telegram', url: 'https://t.me/joinchat/JavaIntro2025A' },
  { courseNumber: '20407', year: 2025, semester: 'ב', platform: 'whatsapp', url: 'https://chat.whatsapp.com/DataStructures2025B' },
  { courseNumber: '20417', year: 2025, semester: 'ב', platform: 'telegram', url: 'https://t.me/algorithms2025b' },
  { courseNumber: '20594', year: 2026, semester: 'א', platform: 'whatsapp', url: 'https://chat.whatsapp.com/OperatingSystems2026A' },
  { courseNumber: '20474', year: 2025, semester: 'א', platform: 'telegram', url: 'https://t.me/+calculus1_2025a' },
  { courseNumber: '20109', year: 2025, semester: 'ג', platform: 'whatsapp', url: 'https://chat.whatsapp.com/LinearAlgebra1Summer' },
  { courseNumber: '20417', year: 2026, semester: 'א', platform: 'whatsapp', url: 'https://chat.whatsapp.com/Algorithms2026A' },
];

async function seed() {
  await db.insert(studyGroupLinks).values(SEED_LINKS);
  console.log(`Seeded ${SEED_LINKS.length} study-group links.`);
}

seed().then(() => process.exit(0));
