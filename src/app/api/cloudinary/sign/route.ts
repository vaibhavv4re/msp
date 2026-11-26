import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
cloudinary.config({cloud_name:process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});
export async function POST(request:Request){
 try{
  const cloudName=process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey=process.env.CLOUDINARY_API_KEY;
  const apiSecret=process.env.CLOUDINARY_API_SECRET;
  if(!cloudName||!apiKey||!apiSecret){
   console.error("Cloudinary upload signing is not configured",{cloudName:!!cloudName,apiKey:!!apiKey,apiSecret:!!apiSecret});
   return NextResponse.json({error:"Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, then restart the server."},{status:500});
  }
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const businessId=(await cookies()).get("backdrop_active_business_id")?.value;
  if(!businessId)return NextResponse.json({error:"Choose a workspace first"},{status:400});
  const {data:member}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",user.id).maybeSingle();
  if(!member||!["owner","admin","accountant","employee"].includes(member.role))return NextResponse.json({error:"Not authorized"},{status:403});
  const body=await request.json();const folder=String(body?.paramsToSign?.folder??"");
  if(!folder.startsWith(`expenses/${businessId}/`)||folder.length>240)return NextResponse.json({error:"Invalid upload folder"},{status:400});
  // Generate the timestamp on the server to avoid browser clock skew and stale client timestamps.
  const timestamp=Math.round(Date.now()/1000);const paramsToSign:any={timestamp,folder};
  if(body?.paramsToSign?.ocr==="adv_ocr")paramsToSign.ocr="adv_ocr";
  const signature=cloudinary.utils.api_sign_request(paramsToSign,apiSecret);
  return NextResponse.json({signature,apiKey,cloudName,timestamp});
 }catch(error){console.error("Cloudinary sign error",error);return NextResponse.json({error:"Failed to sign upload"},{status:500});}
}