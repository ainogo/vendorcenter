import { NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";

export interface ContextRequest extends Request {
  requestId?: string;
}

export function requestContext(req: ContextRequest, res: Response, next: NextFunction) {
  const inboundId = req.header("x-request-id");
  const requestId = inboundId && inboundId.trim().length > 0 ? inboundId : nanoid();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}

export function requestLogger(req: ContextRequest, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const log = {
      level: "info",
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs
    };

    console.log(JSON.stringify(log));
  });

  next();
}
