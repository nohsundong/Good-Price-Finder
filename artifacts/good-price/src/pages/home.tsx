import { useState, useMemo } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Phone,
  Store as StoreIcon,
  AlertCircle,
  Pencil,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  useListStores,
  useGetStoresStats,
  useCreateSuggestion,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useGeolocation,
  haversineDistance,
  formatDistance,
} from "@/lib/geo";

type Store = {
  id: number;
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
};

type StoreWithDistance = Store & {
  distance?: number;
};

const RADIUS_OPTIONS = [
  { value: "500", label: "500m" },
  { value: "1000", label: "1km" },
  { value: "3000", label: "3km" },
  { value: "5000", label: "5km" },
  { value: "10000", label: "10km" },
  { value: "30000", label: "30km" },
  { value: "all", label: "전국" },
];

const SORT_OPTIONS = [
  { value: "distance", label: "거리순" },
  { value: "price_asc", label: "낮은 가격순" },
  { value: "price_desc", label: "높은 가격순" },
];

export default function Home() {
  const {
    location,
    loading: geoLoading,
    error: geoError,
    refresh: refreshLocation,
  } = useGeolocation();
  const [radius, setRadius] = useState<string>("3000");
  const [sortBy, setSortBy] = useState<string>("distance");
  const [suggestTarget, setSuggestTarget] = useState<Store | null>(null);

  const {
    data: stores,
    isLoading: storesLoading,
    error: storesError,
  } = useListStores();
  const { data: stats } = useGetStoresStats();

  const effectiveRadius = !location ? "all" : radius;
  const effectiveSort = !location && sortBy === "distance" ? "price_asc" : sortBy;

  const processedStores = useMemo(() => {
    if (!stores) return [];

    let result: StoreWithDistance[] = stores.map((s) => ({ ...s }));

    if (location) {
      result = result.map((s) => ({
        ...s,
        distance: haversineDistance(location, {
          latitude: s.latitude,
          longitude: s.longitude,
        }),
      }));
    }

    if (effectiveRadius !== "all" && location) {
      const radiusKm = parseInt(effectiveRadius) / 1000;
      result = result.filter(
        (s) => s.distance !== undefined && s.distance <= radiusKm,
      );
    }

    result.sort((a, b) => {
      if (effectiveSort === "distance") {
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      } else if (effectiveSort === "price_asc") {
        return a.price - b.price;
      } else if (effectiveSort === "price_desc") {
        return b.price - a.price;
      }
      return 0;
    });

    return result;
  }, [stores, location, effectiveRadius, effectiveSort]);

  if (storesError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>데이터를 불러오지 못했습니다</AlertTitle>
          <AlertDescription>
            잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
        {/* Page intro */}
        <section className="mb-5 md:mb-6">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                내 주변 착한가격업소
              </h1>
              <p className="text-sm text-muted-foreground">
                공공데이터 기반 합리적인 가격의 업소를 찾아보세요.
              </p>
            </div>
            {stats && (
              <div className="hidden shrink-0 sm:block">
                <div className="rounded-lg border border-border bg-card px-3 py-2 text-right shadow-xs">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    전국
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    {stats.total.toLocaleString()}
                    <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                      곳
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Search panel */}
        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
            <LocationStatus
              location={location}
              loading={geoLoading}
              error={geoError}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={refreshLocation}
              disabled={geoLoading}
              aria-label="현재 위치 새로고침"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${geoLoading ? "animate-spin" : ""}`}
              />
              현재 위치
            </Button>
          </div>

          <div className="space-y-4 px-4 py-4">
            <FilterRow
              label="반경"
              disabled={!location}
              hint={!location ? "위치 권한이 필요해요" : undefined}
            >
              <ChipGroup
                options={RADIUS_OPTIONS}
                value={effectiveRadius}
                onChange={setRadius}
                disabled={!location}
              />
            </FilterRow>

            <FilterRow label="정렬">
              <SegmentedGroup
                options={SORT_OPTIONS}
                value={effectiveSort}
                onChange={setSortBy}
                disabledValues={!location ? ["distance"] : []}
              />
            </FilterRow>
          </div>
        </section>

        {/* Results */}
        <section className="mt-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              검색 결과{" "}
              <span className="text-muted-foreground">
                {storesLoading || geoLoading ? "" : `${processedStores.length}건`}
              </span>
            </h2>
            <span className="text-xs text-muted-foreground">
              {SORT_OPTIONS.find((o) => o.value === effectiveSort)?.label}
            </span>
          </div>

          {storesLoading || geoLoading ? (
            <ResultSkeletons />
          ) : processedStores.length === 0 ? (
            <EmptyResults
              hasLocation={!!location}
              onWiden={() => setRadius("all")}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {processedStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onSuggest={() => setSuggestTarget(store)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <SuggestStoreDialog
        store={suggestTarget}
        onClose={() => setSuggestTarget(null)}
      />
    </div>
  );
}

function LocationStatus({
  location,
  loading,
  error,
}: {
  location: { latitude: number; longitude: number } | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
          <Navigation className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        </span>
        <span className="text-muted-foreground">위치 확인 중...</span>
      </div>
    );
  }
  if (!location) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <MapPin className="h-3.5 w-3.5" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-medium text-foreground">전국 보기</div>
          <div className="text-[11px] text-muted-foreground">
            {error ? "위치 권한 없음" : "위치를 가져올 수 없어요"}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Navigation className="h-3.5 w-3.5" />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-medium text-foreground">현재 위치 기준</div>
        <div className="text-[11px] text-muted-foreground">
          가까운 업소부터 보여드려요
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  hint,
  disabled,
  children,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        {hint && (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        )}
      </div>
      <div className={disabled ? "opacity-60" : ""}>{children}</div>
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-thin">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-card text-foreground border-border hover:bg-muted"
            } disabled:cursor-not-allowed`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SegmentedGroup({
  options,
  value,
  onChange,
  disabledValues = [],
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabledValues?: string[];
}) {
  return (
    <div className="inline-flex w-full rounded-lg border border-border bg-muted/50 p-1">
      {options.map((opt) => {
        const active = value === opt.value;
        const isDisabled = disabledValues.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
              active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function StoreCard({
  store,
  onSuggest,
}: {
  store: StoreWithDistance;
  onSuggest: () => void;
}) {
  return (
    <article className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold text-foreground leading-tight">
              {store.name}
            </h3>
            <Badge
              variant="outline"
              className="rounded-full border-border bg-muted/60 px-2 py-0 text-[10px] font-medium text-muted-foreground"
            >
              {store.category}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {store.mainItem}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-foreground tabular-nums leading-tight">
            {store.price.toLocaleString()}
            <span className="ml-0.5 text-xs font-medium text-muted-foreground">
              원
            </span>
          </div>
          {store.distance !== undefined && (
            <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Navigation className="h-2.5 w-2.5" />
              {formatDistance(store.distance)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-border/70 pt-3 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="text-[13px] leading-snug">{store.address}</span>
        </div>
        {store.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <a
              href={`tel:${store.phone}`}
              className="text-[13px] text-foreground hover:text-primary hover:underline"
            >
              {store.phone}
            </a>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {store.naverMapUrl ? (
          <Button
            asChild
            variant="default"
            size="sm"
            className="h-9 flex-1 text-xs font-semibold"
          >
            <a
              href={store.naverMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5"
            >
              네이버지도 보기
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 text-xs font-medium"
            disabled
          >
            지도 정보 없음
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={onSuggest}
          aria-label="정보 수정 제안"
        >
          <Pencil className="h-3.5 w-3.5" />
          수정 제안
        </Button>
      </div>
    </article>
  );
}

function ResultSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-12 ml-auto" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5 border-t border-border/70 pt-3">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyResults({
  hasLocation,
  onWiden,
}: {
  hasLocation: boolean;
  onWiden: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <StoreIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">
        조건에 맞는 업소가 없어요
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        검색 반경을 넓히거나 정렬 조건을 바꿔보세요.
      </p>
      {hasLocation && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 h-8 text-xs"
          onClick={onWiden}
        >
          <ChevronDown className="mr-1 h-3 w-3" />
          전국으로 보기
        </Button>
      )}
    </div>
  );
}

function SuggestStoreDialog({
  store,
  onClose,
}: {
  store: Store | null;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createMutation = useCreateSuggestion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      window.alert("수정 내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await createMutation.mutateAsync({
        data: { storeId: store.id, content: trimmed },
      });
      window.alert("요청되었습니다");
      setContent("");
      onClose();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "data" in err
          ? ((err as { data?: { error?: string } }).data?.error ?? null)
          : null;
      window.alert(msg ?? "요청 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={!!store}
      onOpenChange={(open) => {
        if (!open) {
          setContent("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>정보 수정 제안</DialogTitle>
          <DialogDescription>
            {store?.name ? `'${store.name}' ` : ""}업소 정보의 수정이 필요한 부분을 알려주세요. 검토 후 반영됩니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="suggest-content"
              className="text-xs font-medium text-muted-foreground"
            >
              수정 내용
            </Label>
            <Textarea
              id="suggest-content"
              placeholder="예) 가격이 7,000원으로 변경되었습니다."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={2000}
              disabled={submitting}
              required
              className="resize-none"
            />
            <div className="text-right text-[11px] text-muted-foreground">
              {content.length} / 2000
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setContent("");
                onClose();
              }}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
