import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import WithdrawalsManager from "../WithdrawalsManager";

export const instant = false;

export default async function AdminWithdrawalsFinalizePage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/login");
  }

  return <WithdrawalsManager mode="processing" />;
}