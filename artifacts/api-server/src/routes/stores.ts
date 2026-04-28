import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db, storesTable, type InsertStore } from "@workspace/db";
import {
  ListStoresResponse,
  GetStoresStatsResponse,
  ImportStoresBody,
  ImportStoresResponse,
  UpdateStoreBody,
  UpdateStoreResponse,
  DeleteStoreResponse,
  UpdateStoreParams,
  DeleteStoreParams,
} from "@workspace/api-zod";

type ImportStats = { inserted: number; updated: number };

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

router.patch("/stores/:id", async (req, res): Promise<void> => {
  const params = UpdateStoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "유효하지 않은 ID입니다." });
    return;
  }

  const body = UpdateStoreBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.message }, "Invalid update payload");
    res.status(400).json({ error: body.error.message });
    return;
  }

  const s = body.data;
  const updates: Partial<InsertStore> = {
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
  };

  const [updated] = await db
    .update(storesTable)
    .set(updates)
    .where(eq(storesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "업소를 찾을 수 없습니다." });
    return;
  }

  req.log.info({ id: updated.id }, "Store updated");

  res.json(
    UpdateStoreResponse.parse({
      id: updated.id,
      externalId: updated.externalId,
      category: updated.category,
      name: updated.name,
      mainItem: updated.mainItem,
      price: updated.price,
      phone: updated.phone,
      address: updated.address,
      latitude: updated.latitude,
      longitude: updated.longitude,
      naverMapUrl: updated.naverMapUrl,
    }),
  );
});

router.delete("/stores/:id", async (req, res): Promise<void> => {
  const params = DeleteStoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "유효하지 않은 ID입니다." });
    return;
  }

  const deleted = await db
    .delete(storesTable)
    .where(eq(storesTable.id, params.data.id))
    .returning({ id: storesTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "업소를 찾을 수 없습니다." });
    return;
  }

  req.log.info({ id: params.data.id }, "Store deleted");

  res.json(DeleteStoreResponse.parse({ deleted: deleted.length }));
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

  const stats: ImportStats = await db.transaction(async (tx) => {
    // Build map of existing stores keyed by naverMapUrl (only those with a URL)
    const existing = await tx
      .select({ id: storesTable.id, naverMapUrl: storesTable.naverMapUrl })
      .from(storesTable);
    const byUrl = new Map<string, number>();
    for (const row of existing) {
      if (row.naverMapUrl) byUrl.set(row.naverMapUrl, row.id);
    }

    let inserted = 0;
    let updated = 0;
    const toInsert: InsertStore[] = [];

    for (const s of incoming) {
      const value: InsertStore = {
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
      };

      const existingId = s.naverMapUrl ? byUrl.get(s.naverMapUrl) : undefined;
      if (existingId !== undefined) {
        await tx
          .update(storesTable)
          .set(value)
          .where(eq(storesTable.id, existingId));
        updated++;
      } else {
        toInsert.push(value);
      }
    }

    // Bulk insert new rows in chunks
    const chunkSize = 500;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      await tx.insert(storesTable).values(chunk);
      inserted += chunk.length;
    }

    return { inserted, updated };
  });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(storesTable);

  req.log.info(
    { inserted: stats.inserted, updated: stats.updated, total: count },
    "Stores imported (merge)",
  );

  res.json(
    ImportStoresResponse.parse({
      inserted: stats.inserted,
      updated: stats.updated,
      total: count,
    }),
  );
});

export default router;
