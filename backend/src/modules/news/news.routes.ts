import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { desc } from 'drizzle-orm';
import * as schema from '../../db/schema/index.js';

const createNewsSchema = z.object({
  title: z.string().min(1).max(256),
  body: z.string().min(1),
  type: z.enum(['INFO', 'WARNING', 'CRITICAL', 'MARKET_UPDATE', 'EVENT_UPDATE', 'ANNOUNCEMENT']).default('INFO'),
  audience: z.string().default('ALL_PARTICIPANTS'),
});

export const newsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.optionalAuthenticate] }, async (request) => {
    const rows = await app.db
      .select()
      .from(schema.news)
      .orderBy(desc(schema.news.publishedAt))
      .limit(50);

    return {
      data: rows.map((n) => ({
        news_id: n.publicId,
        type: n.type,
        title: n.title,
        body: n.body,
        published_at: n.publishedAt.toISOString(),
      })),
      request_id: request.requestId,
    };
  });

  app.post('/', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const parsed = createNewsSchema.parse(request.body);
    const publicId = `news_${randomUUID()}`;

    const [newsItem] = await app.db
      .insert(schema.news)
      .values({
        publicId,
        authorUserId: request.user!.userId,
        type: parsed.type,
        title: parsed.title,
        body: parsed.body,
        audience: parsed.audience,
      })
      .returning();

    const formattedNews = {
      news_id: newsItem.publicId,
      type: newsItem.type,
      title: newsItem.title,
      body: newsItem.body,
      published_at: newsItem.publishedAt.toISOString(),
    };

    // Broadcast in real-time to all connected traders
    if (app.wsGateway) {
      app.wsGateway.broadcast('news', formattedNews);
    }

    return reply.status(201).send({
      data: formattedNews,
      request_id: request.requestId,
    });
  });
};
