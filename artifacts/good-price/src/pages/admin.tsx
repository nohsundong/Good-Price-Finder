import { useState, useEffect } from "react";
import { read, utils } from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Pencil,
  Trash2,
  ListOrdered,
  Search,
  ExternalLink,
  Inbox,
  Check,
  MessageSquare,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import {
  useImportStores,
  getListStoresQueryKey,
  getGetStoresStatsQueryKey,
  useListStores,
  useUpdateStore,
  useDeleteStore,
  useListSuggestions,
  useUpdateSuggestion,
  useDeleteSuggestion,
  getListSuggestionsQueryKey,
} from "@workspace/api-client-react";
import type { Store, Suggestion } from "@workspace/api-client-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

type ParsedStore = {
  externalId?: number | null;
  category: string;
  name: string;
  mainItem: string;
  price: number;
  phone?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  naverMapUrl?: string | null;
};

const ADMIN_PASSWORD = "tbelltassi1!";
const AUTH_KEY = "good-price-admin-auth";

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  return fallback;
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      onUnlock();
    } else {
      setError("비밀번호가 올바르지 않습니다.");
      setPassword("");
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            관리자 인증
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            관리자 페이지에 접근하려면 비밀번호를 입력해주세요.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label
              htmlFor="admin-password"
              className="text-xs font-medium text-muted-foreground"
            >
              비밀번호
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
              className="h-10"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="h-10 w-full font-semibold"
            disabled={!password}
          >
            확인
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(AUTH_KEY) === "1",
  );

  if (!authenticated) {
    return <PasswordGate onUnlock={() => setAuthenticated(true)} />;
  }

  return <AdminContent />;
}

function AdminHeader({ storesCount }: { storesCount?: number }) {
  const handleSignOut = () => {
    sessionStorage.removeItem(AUTH_KEY);
    window.location.reload();
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            관리자 대시보드
          </h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            {storesCount !== undefined
              ? `현재 ${storesCount.toLocaleString()}건의 업소가 등록되어 있습니다.`
              : "업소 데이터를 관리합니다."}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        className="h-9 gap-1.5 text-xs"
      >
        <LogOut className="h-3.5 w-3.5" />
        로그아웃
      </Button>
    </div>
  );
}

function AdminStatsRow({ storesCount }: { storesCount?: number }) {
  const { data: suggestions } = useListSuggestions();
  const pendingCount =
    suggestions?.filter((s) => s.status === "pending").length ?? 0;
  const confirmedCount =
    suggestions?.filter((s) => s.status === "confirmed").length ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <StatCard
        label="등록 업소"
        value={storesCount?.toLocaleString() ?? "—"}
        unit="건"
        icon={<ListOrdered className="h-4 w-4" />}
        tone="primary"
      />
      <StatCard
        label="대기 중인 제안"
        value={pendingCount.toLocaleString()}
        unit="건"
        icon={<Inbox className="h-4 w-4" />}
        tone="amber"
      />
      <StatCard
        label="확인된 제안"
        value={confirmedCount.toLocaleString()}
        unit="건"
        icon={<ShieldCheck className="h-4 w-4" />}
        tone="muted"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  icon,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  tone: "primary" | "amber" | "muted";
}) {
  const toneStyles =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700"
        : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneStyles}`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function AdminSection({
  icon,
  title,
  description,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function AdminContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStore[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Store | null>(null);
  const [deleting, setDeleting] = useState<Store | null>(null);

  const { data: stores, isLoading: storesLoading } = useListStores();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStoresStatsQueryKey() });
  };

  const importMutation = useImportStores({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "데이터 병합 완료",
          description: `신규 ${data.inserted.toLocaleString()}건 / 갱신 ${data.updated.toLocaleString()}건 (총 ${data.total.toLocaleString()}건)`,
        });
        invalidateAll();
        setFile(null);
        setParsedData([]);
      },
      onError: (err) => {
        toast({
          title: "오류 발생",
          description: getErrorMessage(
            err,
            "데이터를 저장하는 중 문제가 발생했습니다.",
          ),
          variant: "destructive",
        });
      },
    },
  });

  const updateMutation = useUpdateStore({
    mutation: {
      onSuccess: () => {
        toast({
          title: "수정 완료",
          description: "업소 정보가 수정되었습니다.",
        });
        invalidateAll();
        setEditing(null);
      },
      onError: (err) => {
        toast({
          title: "수정 실패",
          description: getErrorMessage(
            err,
            "업소 정보를 수정하는 중 문제가 발생했습니다.",
          ),
          variant: "destructive",
        });
      },
    },
  });

  const deleteMutation = useDeleteStore({
    mutation: {
      onSuccess: () => {
        toast({
          title: "삭제 완료",
          description: "업소가 삭제되었습니다.",
        });
        invalidateAll();
        setDeleting(null);
      },
      onError: (err) => {
        toast({
          title: "삭제 실패",
          description: getErrorMessage(
            err,
            "업소를 삭제하는 중 문제가 발생했습니다.",
          ),
          variant: "destructive",
        });
      },
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setIsParsing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = read(data, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonData = utils.sheet_to_json<Record<string, any>>(worksheet);

      if (jsonData.length === 0) {
        throw new Error("엑셀 파일에 데이터가 없습니다.");
      }

      const mappedData: ParsedStore[] = jsonData
        .map((row: Record<string, any>, index: number) => {
          const priceRaw = row["가격"] || row["가격(원)"];
          const parsedPrice =
            typeof priceRaw === "number"
              ? priceRaw
              : parseInt(String(priceRaw).replace(/[^0-9]/g, ""), 10);

          if (
            !row["업소명"] ||
            !row["업종명"] ||
            !row["주소"] ||
            isNaN(parsedPrice) ||
            !row["위도"] ||
            !row["경도"]
          ) {
            console.warn(`Row ${index + 2} missing required fields:`, row);
          }

          return {
            externalId: row["번호"] ? Number(row["번호"]) : null,
            category: String(row["업종명"] || row["업종"] || ""),
            name: String(row["업소명"] || ""),
            mainItem: String(row["주요품목"] || ""),
            price: isNaN(parsedPrice) ? 0 : parsedPrice,
            phone:
              row["업소 전화번호"] || row["전화번호"]
                ? String(row["업소 전화번호"] || row["전화번호"])
                : null,
            address: String(row["주소"] || ""),
            latitude: Number(row["위도"]),
            longitude: Number(row["경도"]),
            naverMapUrl:
              row["네이버지도URL"] || row["네이버지도"]
                ? String(row["네이버지도URL"] || row["네이버지도"])
                : null,
          };
        })
        .filter(
          (s) =>
            s.name && s.category && s.address && s.latitude && s.longitude,
        );

      if (mappedData.length === 0) {
        throw new Error("유효한 데이터 행을 찾을 수 없습니다. 컬럼명을 확인해주세요.");
      }

      setParsedData(mappedData);
    } catch (err) {
      console.error("Excel parse error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "엑셀 파일을 처리하는 중 알 수 없는 오류가 발생했습니다.",
      );
      setParsedData([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = () => {
    if (parsedData.length === 0) return;
    importMutation.mutate({ data: { stores: parsedData } });
  };

  const filteredStores = (stores ?? []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.mainItem.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <AdminHeader storesCount={stores?.length} />

        <AdminStatsRow storesCount={stores?.length} />

        <AdminSection
          icon={<Upload className="h-4 w-4" />}
          title="엑셀 데이터 가져오기"
          description="네이버지도 URL 기준으로 기존 데이터와 병합합니다 (있으면 갱신, 없으면 추가)."
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="excel-upload"
                      className="text-sm font-medium text-foreground"
                    >
                      엑셀 파일 선택
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      필수 컬럼: 업종명, 업소명, 주요품목, 가격, 주소, 위도, 경도
                    </p>
                  </div>
                </div>
                <Input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  disabled={isParsing || importMutation.isPending}
                  className="h-9 w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-background hover:file:bg-foreground/90 sm:w-auto sm:max-w-[260px]"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {isParsing && (
              <p className="animate-pulse text-sm text-muted-foreground">
                파일을 분석하는 중...
              </p>
            )}

            {parsedData.length > 0 && (
              <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="text-sm text-foreground">
                    총{" "}
                    <span className="font-semibold">
                      {parsedData.length.toLocaleString()}
                    </span>
                    건이 분석되었습니다. 기존 데이터와 병합합니다.
                  </div>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  size="sm"
                  className="h-9 shrink-0 px-4 font-semibold"
                >
                  {importMutation.isPending ? (
                    "저장 중..."
                  ) : (
                    <>
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      병합 저장
                    </>
                  )}
                </Button>
              </div>
            )}

            {parsedData.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="border-b border-border bg-muted/40 px-4 py-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    데이터 미리보기 (상위 5건)
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 text-xs">업소명</TableHead>
                        <TableHead className="h-9 text-xs">업종</TableHead>
                        <TableHead className="h-9 text-xs">주요품목</TableHead>
                        <TableHead className="h-9 text-xs text-right">가격</TableHead>
                        <TableHead className="h-9 text-xs">주소</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 5).map((store, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-2 text-sm font-medium">
                            {store.name}
                          </TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground">
                            {store.category}
                          </TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground">
                            {store.mainItem}
                          </TableCell>
                          <TableCell className="py-2 text-right text-sm tabular-nums">
                            {store.price.toLocaleString()}원
                          </TableCell>
                          <TableCell
                            className="max-w-[240px] truncate py-2 text-sm text-muted-foreground"
                            title={store.address}
                          >
                            {store.address}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </AdminSection>

        <AdminSection
          icon={<ListOrdered className="h-4 w-4" />}
          title="업소 관리"
          description="개별 업소를 수정하거나 삭제할 수 있습니다."
          right={
            stores && (
              <span className="text-xs font-medium text-muted-foreground">
                총 {stores.length.toLocaleString()}건
              </span>
            )
          }
        >
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="업소명, 업종, 품목, 주소로 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9"
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        업소명
                      </TableHead>
                      <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        업종
                      </TableHead>
                      <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        품목
                      </TableHead>
                      <TableHead className="h-10 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        가격
                      </TableHead>
                      <TableHead className="hidden h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">
                        주소
                      </TableHead>
                      <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        네이버지도
                      </TableHead>
                      <TableHead className="h-10 w-[120px] text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        관리
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storesLoading && (
                      <>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={7} className="py-3">
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                    {!storesLoading && filteredStores.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-12 text-center text-sm text-muted-foreground"
                        >
                          {stores && stores.length > 0
                            ? "검색 결과가 없습니다."
                            : "등록된 업소가 없습니다."}
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredStores.map((store) => (
                      <TableRow key={store.id} className="hover:bg-muted/30">
                        <TableCell className="py-3 text-sm font-medium text-foreground">
                          {store.name}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {store.category}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {store.mainItem}
                        </TableCell>
                        <TableCell className="py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                          {store.price.toLocaleString()}원
                        </TableCell>
                        <TableCell
                          className="hidden max-w-[240px] truncate py-3 text-sm text-muted-foreground md:table-cell"
                          title={store.address}
                        >
                          {store.address}
                        </TableCell>
                        <TableCell className="max-w-[260px] py-3">
                          {store.naverMapUrl ? (
                            <a
                              href={store.naverMapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline break-all"
                              title={store.naverMapUrl}
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="break-all">
                                {store.naverMapUrl}
                              </span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              없음
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditing(store)}
                              aria-label="수정"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleting(store)}
                              aria-label="삭제"
                              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </AdminSection>

        <SuggestionsManager />
      </div>

      <EditStoreDialog
        store={editing}
        onClose={() => setEditing(null)}
        onSubmit={(data) => {
          if (!editing) return;
          updateMutation.mutate({ id: editing.id, data });
        }}
        isPending={updateMutation.isPending}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>업소를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">
                {deleting?.name}
              </span>
              {" "}업소를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleting) deleteMutation.mutate({ id: deleting.id });
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type EditFormValues = {
  category: string;
  name: string;
  mainItem: string;
  price: string;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
  naverMapUrl: string;
};

function storeToForm(store: Store): EditFormValues {
  return {
    category: store.category,
    name: store.name,
    mainItem: store.mainItem,
    price: String(store.price),
    phone: store.phone ?? "",
    address: store.address,
    latitude: String(store.latitude),
    longitude: String(store.longitude),
    naverMapUrl: store.naverMapUrl ?? "",
  };
}

function EditStoreDialog({
  store,
  onClose,
  onSubmit,
  isPending,
}: {
  store: Store | null;
  onClose: () => void;
  onSubmit: (data: {
    externalId: number | null;
    category: string;
    name: string;
    mainItem: string;
    price: number;
    phone: string | null;
    address: string;
    latitude: number;
    longitude: number;
    naverMapUrl: string | null;
  }) => void;
  isPending: boolean;
}) {
  const [values, setValues] = useState<EditFormValues | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (store) {
      setValues(storeToForm(store));
      setFormError(null);
    } else {
      setValues(null);
      setFormError(null);
    }
  }, [store]);

  if (!store || !values) {
    return (
      <Dialog open={false} onOpenChange={(open) => !open && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const setField = <K extends keyof EditFormValues>(
    key: K,
    value: EditFormValues[K],
  ) => {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const price = parseInt(values.price.replace(/[^0-9]/g, ""), 10);
    const latitude = parseFloat(values.latitude);
    const longitude = parseFloat(values.longitude);

    if (!values.name.trim() || !values.category.trim() || !values.address.trim()) {
      setFormError("업소명, 업종, 주소는 필수입니다.");
      return;
    }
    if (isNaN(price) || price < 0) {
      setFormError("가격은 0 이상의 숫자여야 합니다.");
      return;
    }
    if (isNaN(latitude) || isNaN(longitude)) {
      setFormError("위도와 경도는 숫자여야 합니다.");
      return;
    }

    onSubmit({
      externalId: store.externalId,
      category: values.category.trim(),
      name: values.name.trim(),
      mainItem: values.mainItem.trim(),
      price,
      phone: values.phone.trim() ? values.phone.trim() : null,
      address: values.address.trim(),
      latitude,
      longitude,
      naverMapUrl: values.naverMapUrl.trim()
        ? values.naverMapUrl.trim()
        : null,
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>업소 정보 수정</DialogTitle>
          <DialogDescription>
            {store.name} 업소의 정보를 수정합니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="edit-name">업소명 *</Label>
              <Input
                id="edit-name"
                value={values.name}
                onChange={(e) => setField("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-category">업종 *</Label>
              <Input
                id="edit-category"
                value={values.category}
                onChange={(e) => setField("category", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-mainItem">주요품목</Label>
              <Input
                id="edit-mainItem"
                value={values.mainItem}
                onChange={(e) => setField("mainItem", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-price">가격(원) *</Label>
              <Input
                id="edit-price"
                type="number"
                inputMode="numeric"
                value={values.price}
                onChange={(e) => setField("price", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">전화번호</Label>
              <Input
                id="edit-phone"
                value={values.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="edit-address">주소 *</Label>
              <Input
                id="edit-address"
                value={values.address}
                onChange={(e) => setField("address", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-latitude">위도 *</Label>
              <Input
                id="edit-latitude"
                inputMode="decimal"
                value={values.latitude}
                onChange={(e) => setField("latitude", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-longitude">경도 *</Label>
              <Input
                id="edit-longitude"
                inputMode="decimal"
                value={values.longitude}
                onChange={(e) => setField("longitude", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="edit-naverMapUrl">네이버 지도 URL</Label>
              <Input
                id="edit-naverMapUrl"
                value={values.naverMapUrl}
                onChange={(e) => setField("naverMapUrl", e.target.value)}
                placeholder="https://map.naver.com/..."
              />
            </div>
          </div>

          {formError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuggestionsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"pending" | "confirmed" | "all">("pending");
  const [deleting, setDeleting] = useState<Suggestion | null>(null);

  const { data: pending, isLoading: pendingLoading } = useListSuggestions({
    status: "pending",
  });
  const { data: confirmed, isLoading: confirmedLoading } = useListSuggestions({
    status: "confirmed",
  });
  const { data: all, isLoading: allLoading } = useListSuggestions({
    status: "all",
  });

  const invalidateSuggestions = () => {
    queryClient.invalidateQueries({
      queryKey: getListSuggestionsQueryKey({ status: "pending" }),
    });
    queryClient.invalidateQueries({
      queryKey: getListSuggestionsQueryKey({ status: "confirmed" }),
    });
    queryClient.invalidateQueries({
      queryKey: getListSuggestionsQueryKey({ status: "all" }),
    });
  };

  const updateMutation = useUpdateSuggestion({
    mutation: {
      onSuccess: () => {
        toast({
          title: "처리 완료",
          description: "제안이 확인됨으로 변경되었습니다.",
        });
        invalidateSuggestions();
      },
      onError: (err) => {
        toast({
          title: "처리 실패",
          description: getErrorMessage(err, "상태 변경 중 오류가 발생했습니다."),
          variant: "destructive",
        });
      },
    },
  });

  const deleteMutation = useDeleteSuggestion({
    mutation: {
      onSuccess: () => {
        toast({
          title: "삭제 완료",
          description: "제안이 삭제되었습니다.",
        });
        invalidateSuggestions();
        setDeleting(null);
      },
      onError: (err) => {
        toast({
          title: "삭제 실패",
          description: getErrorMessage(err, "제안 삭제 중 오류가 발생했습니다."),
          variant: "destructive",
        });
      },
    },
  });

  return (
    <AdminSection
      icon={<MessageSquare className="h-4 w-4" />}
      title="정보 수정 제안"
      description="이용자가 보낸 정보 수정 제안을 확인하고 처리합니다."
      right={
        pending && pending.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            대기 {pending.length}
          </span>
        ) : null
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="text-xs">
            대기{" "}
            {pending && pending.length > 0 ? `(${pending.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs">
            확인됨{" "}
            {confirmed && confirmed.length > 0
              ? `(${confirmed.length})`
              : ""}
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            전체 {all && all.length > 0 ? `(${all.length})` : ""}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <SuggestionList
            items={pending}
            isLoading={pendingLoading}
            onConfirm={(s) =>
              updateMutation.mutate({
                id: s.id,
                data: { status: "confirmed" },
              })
            }
            onDelete={(s) => setDeleting(s)}
            showConfirm
          />
        </TabsContent>
        <TabsContent value="confirmed" className="mt-4">
          <SuggestionList
            items={confirmed}
            isLoading={confirmedLoading}
            onConfirm={() => {}}
            onDelete={(s) => setDeleting(s)}
            showConfirm={false}
          />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <SuggestionList
            items={all}
            isLoading={allLoading}
            onConfirm={(s) =>
              updateMutation.mutate({
                id: s.id,
                data: { status: "confirmed" },
              })
            }
            onDelete={(s) => setDeleting(s)}
            showConfirm
          />
        </TabsContent>
      </Tabs>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제안을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleting) deleteMutation.mutate({ id: deleting.id });
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminSection>
  );
}

function SuggestionList({
  items,
  isLoading,
  onConfirm,
  onDelete,
  showConfirm,
}: {
  items: Suggestion[] | undefined;
  isLoading: boolean;
  onConfirm: (s: Suggestion) => void;
  onDelete: (s: Suggestion) => void;
  showConfirm: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Inbox className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          표시할 제안이 없습니다.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {items.map((s) => {
        const isPending = s.status === "pending";
        return (
          <article
            key={s.id}
            className="group rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-border/80"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex h-1.5 w-1.5 rounded-full ${
                      isPending ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {s.storeName ?? `업소 #${s.storeId}`}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      isPending
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {isPending ? "대기" : "확인됨"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                  {s.content}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                {showConfirm && isPending && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onConfirm(s)}
                    aria-label="확인 처리"
                    className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(s)}
                  aria-label="삭제"
                  className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
