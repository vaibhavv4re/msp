"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_WORKSPACE_COOKIE = "backdrop_active_business_id";

export async function setActiveWorkspace(businessId: string) {
  const normalizedId = businessId.trim();
  if (!normalizedId) return { error: "Choose a valid workspace." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Your session has expired. Sign in again." };
  }

  // Confirm membership through the user's RLS-scoped session before storing
  // a browser-supplied business ID as the active workspace.
  const { data: membership, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("business_id", normalizedId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: "You do not have access to that workspace." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, normalizedId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/workspace");
  return { success: true };
}
