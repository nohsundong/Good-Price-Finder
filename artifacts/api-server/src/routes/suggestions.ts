import { Router } from "express";  // IRouter 제거
import { eq, desc } from "drizzle-orm";
import {
  db,
  storeSuggestionsTable,
  storesTable,
  suggestionStatusValues,
  type SuggestionStatus,
} from "@workspace/db";
import {
  CreateSuggestionBody,
  CreateSuggestionResponse,
  ListSuggestionsQueryParams,
  ListSuggestionsResponse,
  UpdateSuggestionBody,
  UpdateSuggestionParams,
  UpdateSuggestionResponse,
  DeleteSuggestionParams,
  DeleteSuggestionResponse,
} from "@workspace/api-zod";

const router = Router();  // 타입 추론

router.get("/suggestions", async (req: any, res: any): Promise<void> => {
  const parsed = ListSuggestionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const filter = parsed.data.status ?? "all";

  const baseQuery = db
    .select({
      id: storeSuggestionsTable.id,
      storeId: storeSuggestionsTable.storeId,
      storeName: storesTable.name,
      content: storeSuggestionsTable.content,
      status: storeSuggestionsTable.status,
      createdAt: storeSuggestionsTable.createdAt,
    })
    .from(storeSuggestionsTable)
    .leftJoin(storesTable, eq(storesTable.id, storeSuggestionsTable.storeId))
    .orderBy(desc(storeSuggestionsTable.createdAt));

  const rows =
    filter === "all"
      ? await baseQuery
      : await baseQuery.where(eq(storeSuggestionsTable.status, filter));

  const payload = rows.map((r) => ({
    id: r.id,
    storeId: r.storeId,
    storeName: r.storeName ?? null,
    content: r.content,
    status: r.status as SuggestionStatus,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(ListSuggestionsResponse.parse(payload));
});

router.post("/suggestions", async (req: any, res: any): Promise<void> => {
  const parsed = CreateSuggestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { storeId, content } = parsed.data;

  const [existingStore] = await db
    .select({ id: storesTable.id, name: storesTable.name })
    .from(storesTable)
    .where(eq(storesTable.id, storeId))
    .limit(1);

  if (!existingStore) {
    res.status(404).json({ error: "업소를 찾을 수 없습니다." });
    return;
  }

  const [inserted] = await db
    .insert(storeSuggestionsTable)
    .values({ storeId, content, status: "pending" })
    .returning();

  // req.log 타입 에러 우회
  (req as any).log?.info({ suggestionId: inserted.id, storeId }, "Suggestion created");

  res.json(
    CreateSuggestionResponse.parse({
      id: inserted.id,
      storeId: inserted.storeId,
      storeName: existingStore.name,
      content: inserted.content,
      status: inserted.status as SuggestionStatus,
      createdAt: inserted.createdAt.toISOString(),
    }),
  );
});

router.patch("/suggestions/:id", async (req: any, res: any): Promise<void> => {
  const params = UpdateSuggestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateSuggestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const status = body.data.status;
  if (!suggestionStatusValues.includes(status)) {
    res.status(400).json({ error: "유효하지 않은 상태입니다." });
    return;
  }

  const [updated] = await db
    .update(storeSuggestionsTable)
    .set({ status })
    .where(eq(storeSuggestionsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "제안을 찾을 수 없습니다." });
    return;
  }

  const [store] = await db
    .select({ name: storesTable.name })
    .from(storesTable)
    .where(eq(storesTable.id, updated.storeId))
    .limit(1);

  res.json(
    UpdateSuggestionResponse.parse({
      id: updated.id,
      storeId: updated.storeId,
      storeName: store?.name ?? null,
      content: updated.content,
      status: updated.status as SuggestionStatus,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

router.delete("/suggestions/:id", async (req: any, res: any): Promise<void> => {
  const params = DeleteSuggestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deleted = await db
    .delete(storeSuggestionsTable)
    .where(eq(storeSuggestionsTable.id, params.data.id))
    .returning({ id: storeSuggestionsTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "제안을 찾을 수 없습니다." });
    return;
  }

  res.json(DeleteSuggestionResponse.parse({ deleted: deleted.length }));
});

export default router;