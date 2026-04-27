import { useState } from "react";
import { read, utils } from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Database, FileSpreadsheet, AlertTriangle, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { useImportStores, getListStoresQueryKey, getGetStoresStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <div className="flex-1 p-4 md:p-6 flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            관리자 인증
          </CardTitle>
          <CardDescription>
            관리자 페이지에 접근하려면 비밀번호를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">비밀번호</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={!password}>
              확인
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState<boolean>(
    () => typeof window !== "undefined" && sessionStorage.getItem(AUTH_KEY) === "1",
  );

  if (!authenticated) {
    return <PasswordGate onUnlock={() => setAuthenticated(true)} />;
  }

  return <AdminContent />;
}

function AdminContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStore[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importMutation = useImportStores({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "데이터 교체 완료",
          description: `총 ${data.inserted}건의 착한가격업소가 성공적으로 저장되었습니다.`,
        });
        queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStoresStatsQueryKey() });
        setFile(null);
        setParsedData([]);
      },
      onError: (err) => {
        const message =
          (err && typeof err === "object" && "data" in err
            ? (err as { data?: { error?: string } }).data?.error
            : undefined) ?? "데이터를 저장하는 중 문제가 발생했습니다.";
        toast({
          title: "오류 발생",
          description: message,
          variant: "destructive",
        });
      }
    }
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

      // Map Korean column names to ParsedStore
      const mappedData: ParsedStore[] = jsonData.map((row: Record<string, any>, index: number) => {
        const priceRaw = row["가격"] || row["가격(원)"];
        const parsedPrice = typeof priceRaw === 'number' ? priceRaw : parseInt(String(priceRaw).replace(/[^0-9]/g, ''), 10);

        if (!row["업소명"] || !row["업종명"] || !row["주소"] || isNaN(parsedPrice) || !row["위도"] || !row["경도"]) {
          console.warn(`Row ${index + 2} missing required fields:`, row);
        }

        return {
          externalId: row["번호"] ? Number(row["번호"]) : null,
          category: String(row["업종명"] || row["업종"] || ""),
          name: String(row["업소명"] || ""),
          mainItem: String(row["주요품목"] || ""),
          price: isNaN(parsedPrice) ? 0 : parsedPrice,
          phone: row["업소 전화번호"] || row["전화번호"] ? String(row["업소 전화번호"] || row["전화번호"]) : null,
          address: String(row["주소"] || ""),
          latitude: Number(row["위도"]),
          longitude: Number(row["경도"]),
          naverMapUrl: row["네이버지도URL"] || row["네이버지도"] ? String(row["네이버지도URL"] || row["네이버지도"]) : null,
        };
      }).filter(s => s.name && s.category && s.address && s.latitude && s.longitude); // Basic validation

      if (mappedData.length === 0) {
        throw new Error("유효한 데이터 행을 찾을 수 없습니다. 컬럼명을 확인해주세요.");
      }

      setParsedData(mappedData);
    } catch (err) {
      console.error("Excel parse error:", err);
      setError(err instanceof Error ? err.message : "엑셀 파일을 처리하는 중 알 수 없는 오류가 발생했습니다.");
      setParsedData([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = () => {
    if (parsedData.length === 0) return;
    
    importMutation.mutate({
      data: {
        stores: parsedData
      }
    });
  };

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-muted/30">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            데이터 관리
          </h1>
          <p className="text-muted-foreground text-sm">
            공공데이터포털의 착한가격업소 엑셀 데이터를 업로드하여 전체 목록을 갱신합니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">엑셀 파일 업로드</CardTitle>
            <CardDescription>
              새로운 데이터로 기존 데이터를 완전히 덮어씁니다. <br/>
              필수 컬럼: <span className="font-medium text-foreground">업종명, 업소명, 주요품목, 가격, 주소, 위도, 경도</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="excel-upload">엑셀 파일 (.xlsx, .xls)</Label>
              <Input 
                id="excel-upload" 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleFileChange}
                disabled={isParsing || importMutation.isPending}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>오류</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isParsing && <p className="text-sm text-muted-foreground animate-pulse">파일을 분석하는 중...</p>}
            
            {parsedData.length > 0 && (
              <Alert className="bg-primary/5 border-primary/20">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary">분석 완료</AlertTitle>
                <AlertDescription className="text-foreground">
                  총 <span className="font-bold">{parsedData.length.toLocaleString()}</span>건의 유효한 업소 데이터를 발견했습니다. 
                  기존 데이터를 삭제하고 이 데이터로 교체하시겠습니까?
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleImport} 
              disabled={parsedData.length === 0 || importMutation.isPending}
              className="w-full sm:w-auto"
            >
              {importMutation.isPending ? (
                "데이터 저장 중..."
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  전체 데이터 교체
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {parsedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                데이터 미리보기 (상위 5건)
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>업소명</TableHead>
                    <TableHead>업종</TableHead>
                    <TableHead>주요품목</TableHead>
                    <TableHead>가격</TableHead>
                    <TableHead>주소</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 5).map((store, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell>{store.category}</TableCell>
                      <TableCell>{store.mainItem}</TableCell>
                      <TableCell>{store.price.toLocaleString()}원</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={store.address}>{store.address}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
