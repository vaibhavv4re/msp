import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
cloudinary.config({cloud_name:process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});
function parseOCRText(text:string){
 const lines=text.split("\n").map(x=>x.trim()).filter(Boolean);
 const amountCandidates=lines.flatMap(line=>{if(/\d\s*%/.test(line))return[];const m=line.match(/(?:grand\s+total|net\s+amount|amount\s+due|total|amount)[^\d]{0,15}(\d[\d,]*(?:\.\d{2})?)/ig);return m?.map(x=>Number((x.match(/\d[\d,]*(?:\.\d{2})?/)?.[0]??"").replace(/,/g,""))).filter(x=>x>0)??[];});
 const dateMatch=text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
 let date:string|undefined;if(dateMatch){let [,d,m,y]=dateMatch;if(y.length===2)y="20"+y;date=`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;}
 return {amount:amountCandidates.length?Math.max(...amountCandidates):undefined,date,vendorName:lines[0]?.slice(0,80),gstCharged:/\bGST\b|\bIGST\b|\bCGST\b|\bSGST\b/i.test(text)};
}
export async function POST(request:Request){
 try{
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const businessId=(await cookies()).get("backdrop_active_business_id")?.value;if(!businessId)return NextResponse.json({error:"Choose a workspace first"},{status:400});
  const {data:member}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",user.id).maybeSingle();if(!member||!["owner","admin","accountant","employee"].includes(member.role))return NextResponse.json({error:"Not authorized"},{status:403});
  const {expenseId,publicId,resourceType="image"}=await request.json();if(!expenseId||typeof publicId!=="string"||!publicId.startsWith(`expenses/${businessId}/`))return NextResponse.json({error:"Invalid expense receipt"},{status:400});
  const {data:expense}=await supabase.from("expenses").select("id").eq("id",expenseId).eq("business_id",businessId).maybeSingle();if(!expense)return NextResponse.json({error:"Expense not found"},{status:404});
  const result=await cloudinary.uploader.explicit(publicId,{type:"upload",resource_type:resourceType==="raw"?"raw":"image",ocr:"adv_ocr"});
  const blocks=result.info?.ocr?.adv_ocr?.data??[];const fullText=blocks.map((b:any)=>b.textAnnotations?.[0]?.description).filter(Boolean).join("\n");
  const suggestions=fullText?parseOCRText(fullText):null;const status=suggestions?"done":"failed";
  const {error}=await supabase.rpc("update_expense_ocr",{p_expense_id:expenseId,p_business_id:businessId,p_status:status,p_suggestions:suggestions as any});
  if(error)throw error;
  return NextResponse.json({success:true,status,suggestions});
 }catch(error:any){console.error("OCR process error",error);return NextResponse.json({error:"OCR processing failed"},{status:500});}
}