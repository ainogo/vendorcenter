import { Request, Response, NextFunction } from "express";
import xss, { IFilterXSSOptions } from "xss";

const xssOptions: IFilterXSSOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
};

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return xss(value, xssOptions);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    cleaned[key] = sanitizeValue(obj[key]);
  }
  return cleaned;
}

/**
 * Express middleware: sanitize all string values in req.body, req.query, req.params
 * to strip HTML/script tags and prevent stored XSS.
 */
export function xssSanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body as Record<string, unknown>);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query as Record<string, unknown>) as typeof req.query;
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params as Record<string, unknown>) as typeof req.params;
  }
  next();
}
