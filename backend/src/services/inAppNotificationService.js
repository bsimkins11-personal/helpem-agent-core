import { prisma } from "../lib/prisma.js";

export async function createInAppNotification(userId, { type, title, body = null, data = null }) {
  if (!userId || !type || !title) return null;

  return prisma.inAppNotification.create({
    data: {
      userId,
      type,
      title,
      body,
      data,
    },
  });
}

export async function listInAppNotifications(userId, { limit = 20, unreadOnly = false } = {}) {
  const take = Math.min(Math.max(limit, 1), 100);
  return prisma.inAppNotification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function markInAppNotificationsRead(userId, ids = []) {
  if (!ids.length) return { count: 0 };
  return prisma.inAppNotification.updateMany({
    where: {
      userId,
      id: { in: ids },
    },
    data: { readAt: new Date() },
  });
}

export async function markAllInAppNotificationsRead(userId) {
  return prisma.inAppNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
