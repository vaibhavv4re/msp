import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
cloudinary.config({cloud_name:process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});
export async function POST(request:Request){
 try{
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const businessId=(await cookies()).get("backdrop_active_business_id")?.value;
  if(!businessId)return NextResponse.json({error:"Choose a workspace first"},{status:400});
  const {data:member}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",user.id).maybeSingle();
  if(!member||!["owner","admin","accountant"].includes(member.role))return NextResponse.json({error:"Not authorized"},{status:403});
  const {publicId}=await request.json();if(typeof publicId!=="string"||!publicId.startsWith(`expenses/${businessId}/`))return NextResponse.json({error:"Invalid attachment"},{status:400});
  const result=await cloudinary.uploader.destroy(publicId);
  return NextResponse.json({result});
 }catch(error){console.error("Cloudinary delete error",error);return NextResponse.json({error:"Failed to delete file"},{status:500});}
}