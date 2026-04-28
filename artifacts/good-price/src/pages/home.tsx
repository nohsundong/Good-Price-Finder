import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Navigation, ArrowUpDown, ExternalLink, Phone, Store as StoreIcon, AlertCircle, Info, Pencil } from "lucide-react";
import { useListStores, useGetStoresStats, useCreateSuggestion } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useGeolocation, haversineDistance, formatDistance, GeoLocation } from "@/lib/geo";

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
  { value: "100", label: "100m" },
  { value: "300", label: "300m" },
  { value: "500", label: "500m" },
  { value: "1000", label: "1km" },
  { value: "3000", label: "3km" },
  { value: "5000", label: "5km" },
  { value: "10000", label: "10km" },
  { value: "20000", label: "20km" },
  { value: "30000", label: "30km" },
  { value: "all", label: "전국" },
];

const SORT_OPTIONS = [
  { value: "distance", label: "거리순" },
  { value: "price_asc", label: "가격 낮은순" },
  { value: "price_desc", label: "가격 높은순" },
];

export default function Home() {
  const { location, loading: geoLoading, error: geoError } = useGeolocation();
  const [radius, setRadius] = useState<string>("3000"); // Default 3km
  const [sortBy, setSortBy] = useState<string>("distance");
  const [suggestTarget, setSuggestTarget] = useState<Store | null>(null);

  const { data: stores, isLoading: storesLoading, error: storesError } = useListStores();
  const { data: stats, isLoading: statsLoading } = useGetStoresStats();

  const effectiveRadius = !location ? "all" : radius;
  const effectiveSort = !location && sortBy === "distance" ? "price_asc" : sortBy;

  const processedStores = useMemo(() => {
    if (!stores) return [];

    let result: StoreWithDistance[] = stores.map((s) => ({ ...s }));

    // 1. Calculate distances if location available
    if (location) {
      result = result.map((s) => ({
        ...s,
        distance: haversineDistance(location, { latitude: s.latitude, longitude: s.longitude }),
      }));
    }

    // 2. Filter by radius
    if (effectiveRadius !== "all" && location) {
      const radiusKm = parseInt(effectiveRadius) / 1000;
      result = result.filter((s) => s.distance !== undefined && s.distance <= radiusKm);
    }

    // 3. Sort
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
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>데이터를 불러오는 중 문제가 발생했습니다.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background/50">
      {/* Stats & Location Bar */}
      <div className="bg-card border-b p-4 shadow-sm z-10 sticky top-14">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {geoLoading ? (
                <>
                  <Navigation className="h-4 w-4 animate-spin" />
                  <span>위치 확인 중...</span>
                </>
              ) : geoError || !location ? (
                <>
                  <MapPin className="h-4 w-4 text-destructive" />
                  <span className="text-destructive font-medium">위치 권한 없음</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">현재 위치 기준</span>
                </>
              )}
            </div>
            
            {!statsLoading && stats && (
              <div className="text-xs font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-md shadow-sm">
                전국 {stats.total.toLocaleString()}곳
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Select 
              value={effectiveRadius} 
              onValueChange={setRadius}
              disabled={!location}
            >
              <SelectTrigger className="w-[120px] bg-background">
                <SelectValue placeholder="반경 선택" />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={effectiveSort} 
              onValueChange={setSortBy}
            >
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="정렬 방식" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem 
                    key={opt.value} 
                    value={opt.value}
                    disabled={opt.value === "distance" && !location}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 flex-1 overflow-y-auto pb-20">
        {storesLoading || geoLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : processedStores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="bg-muted p-4 rounded-full mb-4">
              <StoreIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">조건에 맞는 착한가격업소가 없습니다</h3>
            <p className="text-muted-foreground text-sm">
              반경을 넓히거나 다른 지역에서 검색해보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground mb-2 px-1">
              검색 결과 <span className="text-foreground">{processedStores.length}</span>건
            </div>
            {processedStores.map((store) => (
              <Card key={store.id} className="overflow-hidden transition-all hover:shadow-md border-border/60">
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {store.name}
                      <Badge variant="outline" className="font-normal bg-primary/5 text-primary border-primary/20">
                        {store.category}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-foreground">
                      {store.mainItem}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-secondary">
                      {store.price.toLocaleString()}원
                    </div>
                    {store.distance !== undefined && (
                      <div className="text-xs font-medium text-muted-foreground flex items-center justify-end gap-1 mt-1">
                        <Navigation className="h-3 w-3" />
                        {formatDistance(store.distance)}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-3 text-sm text-muted-foreground space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{store.address}</span>
                  </div>
                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <a href={`tel:${store.phone}`} className="text-primary hover:underline">
                        {store.phone}
                      </a>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 pb-3 flex flex-col gap-2">
                  {store.naverMapUrl && (
                    <Button
                      variant="secondary"
                      className="w-full text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      asChild
                    >
                      <a href={store.naverMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                        네이버지도 바로가기 <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full text-sm font-medium"
                    onClick={() => setSuggestTarget(store)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    [정보 수정 제안]
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SuggestStoreDialog
        store={suggestTarget}
        onClose={() => setSuggestTarget(null)}
      />
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
            {store?.name ? `'${store.name}'` : ""} 업소 정보의 수정이 필요한 부분을 알려주세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="suggest-content">수정 내용</Label>
            <Textarea
              id="suggest-content"
              placeholder="예) 가격이 7,000원으로 변경되었습니다."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={2000}
              disabled={submitting}
              required
            />
            <div className="text-xs text-muted-foreground text-right">
              {content.length} / 2000
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
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
