import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

// Server-only: API routes run in EAS Hosting's isolated serverless runtime, where a
// long-lived `pg` pool can't be reused across requests — the HTTP driver fits that model.
export const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
