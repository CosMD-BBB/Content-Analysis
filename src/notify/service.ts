import type { DB } from "../db/client";

/* แจ้งเตือน: เติมใน Task 10 */
export async function notifyPublished(_db: DB, _contentId: string, _actorId?: string): Promise<void> {}
export async function notifyDueSoon(_db: DB): Promise<number> { return 0; }
