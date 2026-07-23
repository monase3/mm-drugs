import { clearAuthCookie } from "@/lib/auth";
import { jsonOk } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAuthCookie();
  return jsonOk({ message: "تم تسجيل الخروج" });
}
