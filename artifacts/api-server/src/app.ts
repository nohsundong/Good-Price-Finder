import express, { type Express } from "express";
import cors from "cors";
import * as pinoHttp from "pino-http";  // namespace import로 변경 [web:16]
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// pinoHttp.default() 호출 + Express.Handler 타입 단언
app.use(
  pinoHttp.default({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }) as express.Handler  // 타입 단언 추가
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;