"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBusinessProfile(input: {
  name: string; legalName: string; businessType: string; address: string;
  city: string; state: string; pin: string; country: string;
  email: string; contact: string; pan: string; gstStatus: string; gstin: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  const businessId = (await cookies()).get("backdrop_active_business_id")?.value;
  if (!businessId) return { error: "Choose a workspace first." };
  const { data: member } = await supabase.from("business_members").select("role")
    .eq("business_id", businessId).eq("user_id", user.id).maybeSingle();
  if (!member || !["owner", "admin"].includes(member.role)) return { error: "Only a workspace owner or admin can update business identity." };

  const name = input.name.trim();
  const pan = input.pan.trim().toUpperCase();
  const gstin = input.gstin.trim().toUpperCase();
  if (!name) return { error: "Business name is required." };
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return { error: "Enter a valid 10-character PAN, or leave it blank for now." };
  if (input.gstStatus === "registered" && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return { error: "Enter a valid 15-character GSTIN, or choose a different registration status." };
  if (input.gstStatus !== "registered" && gstin) return { error: "GSTIN should only be entered when the business is registered." };

  const { error } = await supabase.from("businesses").update({
    name, legal_name: input.legalName.trim() || null, business_type: input.businessType || null,
    address: input.address.trim() || null, city: input.city.trim() || null,
    state: input.state.trim() || null, pin: input.pin.trim() || null,
    country: input.country.trim() || "India", email: input.email.trim() || null,
    contact: input.contact.trim() || null, pan: pan || null,
    gst_type: input.gstStatus === "registered" ? "Regular" : input.gstStatus === "composition" ? "Composition" : "Unregistered",
    gstin: gstin || null, updated_at: new Date().toISOString(),
  }).eq("id", businessId);
  if (error) return { error: error.message };
  revalidatePath("/workspace");
  revalidatePath("/workspace/onboarding");
  return { success: true };
}
