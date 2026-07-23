import { db } from "@/db";
import { notifications } from "@/db/schema";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    referenceId: input.referenceId || null,
    referenceType: input.referenceType || null,
  });
}
