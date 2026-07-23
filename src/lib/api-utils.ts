import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function handleUnknownError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("بيانات غير صالحة", 422, {
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  console.error(error);
  return jsonError("حدث خطأ غير متوقع في الخادم", 500);
}
