import { NextRequest } from "next/server";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { jsonOk, jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await requirePharmacyOwner(request);
  if (!ctx) return jsonError("غير مصرح لك بالوصول إلى هذه البيانات", 401);
  return jsonOk({ pharmacy: ctx.pharmacy });
}
