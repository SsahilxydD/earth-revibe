import { prisma, Prisma } from '@earth-revibe/db';
import type { WhatsAppInboundQuery, WhatsAppInboundResponse } from '@earth-revibe/shared';

// CRM inbox: list inbound messages newest-first with cursor pagination.
// Cursor = receivedAt ISO of the last returned row, so the next page
// asks `receivedAt < cursor`. Tied timestamps tiebreak on id for stability.

export const whatsAppInboundService = {
  async listMessages(query: WhatsAppInboundQuery): Promise<WhatsAppInboundResponse> {
    const { cursor, limit, linkedUser, repliesOnly } = query;

    const where: Prisma.WhatsAppInboundMessageWhereInput = {};
    if (cursor) {
      where.receivedAt = { lt: new Date(cursor) };
    }
    if (linkedUser === 'true') {
      where.userId = { not: null };
    } else if (linkedUser === 'false') {
      where.userId = null;
    }
    if (repliesOnly === 'true') {
      where.repliedTo = { not: null };
    } else if (repliesOnly === 'false') {
      where.repliedTo = null;
    }

    const rows = await prisma.whatsAppInboundMessage.findMany({
      where,
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1, // over-fetch by 1 to know if there's a next page
      select: {
        id: true,
        messageId: true,
        fromWaId: true,
        userId: true,
        messageType: true,
        text: true,
        mediaUrl: true,
        repliedTo: true,
        receivedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? sliced[sliced.length - 1].receivedAt.toISOString() : null;

    return {
      messages: sliced.map((r) => ({
        id: r.id,
        messageId: r.messageId,
        fromWaId: r.fromWaId,
        userId: r.userId,
        user: r.user,
        messageType: r.messageType,
        text: r.text,
        mediaUrl: r.mediaUrl,
        repliedTo: r.repliedTo,
        receivedAt: r.receivedAt.toISOString(),
      })),
      nextCursor,
    };
  },
};
