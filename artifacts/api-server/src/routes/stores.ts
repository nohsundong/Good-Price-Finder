import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, storesTable, type InsertStore } from "@workspace/db";
import {
  ListStoresResponse,
  GetStoresStatsResponse,
  ImportStoresBody,
  ImportStoresResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stores", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(storesTable)
    .orderBy(storesTable.id);

  const data = rows.map((row) => ({
    id: row.id,
    externalId: row.externalId,
    category: row.category,
    name: row.name,
    mainItem: row.mainItem,
    price: row.price,
    phone: row.phone,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    naverMapUrl: row.naverMapUrl,
  }));

  res.json(ListStoresResponse.parse(data));
});

router.get("/stores/stats", async (req, res): Promise<void> => {
  const rows = await db.select().from(storesTable);

  const total = rows.length;
  const averagePrice =
    total === 0
      ? 0
      : Math.round(rows.reduce((sum, r) => sum + r.price, 0) / total);

  const counts = new Map<string, number>();
  let lastUpdated: Date | null = null;
  for (const row of rows) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    if (!lastUpdated || row.updatedAt > lastUpdated) {
      lastUpdated = row.updatedAt;
    }
  }

  const categoryBreakdown = Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  req.log.info({ total }, "Stats requested");

  res.json(
    GetStoresStatsResponse.parse({
      total,
      averagePrice,
      categoryBreakdown,
      lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
    }),
  );
});

router.post("/stores/import", async (req, res): Promise<void> => {
  const parsed = ImportStoresBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn(
      { errors: parsed.error.message },
      "Invalid import payload",
    );
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const incoming = parsed.data.stores;
  if (incoming.length === 0) {
    res.status(400).json({ error: "최소 1건 이상의 데이터가 필요합니다." });
    return;
  }

  const values: InsertStore[] = incoming.map((s) => ({
    externalId: s.externalId ?? null,
    category: s.category,
    name: s.name,
    mainItem: s.mainItem,
    price: s.price,
    phone: s.phone ?? null,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    naverMapUrl: s.naverMapUrl ?? null,
  }));

  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE TABLE ${storesTable} RESTART IDENTITY`);
    // Insert in chunks to keep statement size reasonable
    const chunkSize = 500;
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      await tx.insert(storesTable).values(chunk);
    }
  });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(storesTable);

  req.log.info({ inserted: incoming.length, total: count }, "Stores imported");

  res.json(
    ImportStoresResponse.parse({
      inserted: incoming.length,
      total: count,
    }),
  );
});

export default router;
