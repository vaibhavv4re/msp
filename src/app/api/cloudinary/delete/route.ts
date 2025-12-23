import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { publicId } = body;

        if (!publicId) {
            return NextResponse.json({ error: "Missing publicId" }, { status: 400 });
        }

        const result = await cloudinary.uploader.destroy(publicId);

        return NextResponse.json({ result });
    } catch (error) {
        console.error("Cloudinary delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete file" },
            { status: 500 }
        );
    }
}
