import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// 타입 단언으로 강제 미들웨어 처리 (가장 안정적)
app.use(
  (pinoHttp({
    logger,
    serializers: {
      // req/res any 타입 무시 (pino-http 공식 스펙)
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }) as express.RequestHandler)  // RequestHandler 타입 사용
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;