import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ApiError } from "../utils/api-error";

interface ValidationSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: { field?: string; message: string }[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            field: issue.path.join("."),
            message: issue.message,
          });
        }
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            field: issue.path.join("."),
            message: issue.message,
          });
        }
      } else {
        (req as any).query = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            field: issue.path.join("."),
            message: issue.message,
          });
        }
      } else {
        (req as any).params = result.data;
      }
    }

    if (errors.length > 0) {
      throw ApiError.badRequest("Validation failed", errors);
    }

    next();
  };
};
