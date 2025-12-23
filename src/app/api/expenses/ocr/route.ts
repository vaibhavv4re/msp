import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

function parseOCRText(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // 1. Parse Amount
    // Pick largest monetary value, ignore percentages
    const amountRegex = /(\d{1,3}(,\d{3})*(\.\d{2})?)/g;
    let maxAmount = 0;

    lines.forEach(line => {
        if (line.includes('%')) return; // Ignore tax rates
        const matches = line.match(amountRegex);
        if (matches) {
            matches.forEach(m => {
                const val = parseFloat(m.replace(/,/g, ''));
                if (!isNaN(val) && val > maxAmount) {
                    maxAmount = val;
                }
            });
        }
    });

    // 2. Parse Date
    // Look for valid dates near "Date" keywords
    const dateRegex = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(\d{1,2} [A-Za-z]{3,9} \d{2,4})/g;
    let detectedDate = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('date')) {
            const matches = lines[i].match(dateRegex);
            if (matches) {
                detectedDate = matches[0];
                break;
            }
            // Check next line
            if (i + 1 < lines.length) {
                const nextMatches = lines[i + 1].match(dateRegex);
                if (nextMatches) {
                    detectedDate = nextMatches[0];
                    break;
                }
            }
        }
    }
    // Fallback: any date found
    if (!detectedDate) {
        for (const line of lines) {
            const matches = line.match(dateRegex);
            if (matches) {
                detectedDate = matches[0];
                break;
            }
        }
    }

    // 3. Vendor (First line or line with vendor-like text)
    let vendorName = "";
    if (lines.length > 0) {
        vendorName = lines[0].substring(0, 50); // Usually at the top
    }

    return {
        amount: maxAmount || undefined,
        date: detectedDate || undefined,
        vendorName: vendorName || undefined,
        gstCharged: text.toLowerCase().includes("gst") || text.toLowerCase().includes("tax")
    };
}

export async function POST(request: Request) {
    let currentExpenseId: string | null = null;
    try {
        const { expenseId, publicId, resourceType = "image" } = await request.json();
        currentExpenseId = expenseId;

        if (!expenseId || !publicId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Add 1s delay to allow client-side draft creation to sync to server
        await new Promise(r => setTimeout(r, 1000));

        // 1. Trigger Cloudinary OCR
        console.log(`[OCR] Triggering explicit for ${publicId} as ${resourceType}`);
        const result = await cloudinary.uploader.explicit(publicId, {
            type: "upload",
            resource_type: resourceType,
            ocr: "adv_ocr"
        });

        console.log("[OCR] Cloudinary Result:", JSON.stringify({
            public_id: result.public_id,
            resource_type: result.resource_type,
            has_info: !!result.info,
            has_ocr: !!result.info?.ocr
        }, null, 2));

        const ocrData = result.info?.ocr?.adv_ocr?.data;
        let suggestions = null;
        let status = "failed";

        if (ocrData && ocrData.length > 0) {
            console.log(`[OCR] Found ${ocrData.length} data blocks.`);
            // Cloudinary adv_ocr returns text in blocks.
            // For PDFs, it might be an array of page results or a single flat list of annotations.
            let fullText = "";

            // Check if ocrData[0] has textAnnotations (typical for image)
            if (ocrData[0].textAnnotations) {
                fullText = ocrData.map((block: any) => block.textAnnotations[0]?.description).join('\n');
            } else {
                // Fallback for different structures (e.g. flat strings or blocks)
                fullText = JSON.stringify(ocrData);
            }

            suggestions = parseOCRText(fullText);
            status = "done";
        } else {
            console.log("[OCR] No OCR data found in Cloudinary response.");
        }

        // 2. Update Expense in InstaDB
        try {
            await adminDb.transact([
                adminDb.tx.expenses[expenseId].update({
                    ocrStatus: status,
                    ocrSuggestions: suggestions as any
                })
            ]);
            console.log(`[OCR] DB Update successful for ${expenseId}`);
        } catch (dbError: any) {
            console.error(`[OCR] DB Update failed for ${expenseId}:`, dbError.message);
        }

        return NextResponse.json({ success: true, status, suggestions });
    } catch (error: any) {
        console.error("OCR process error:", error);

        // Attempt to set status to failed in DB if expenseId exists
        if (currentExpenseId) {
            try {
                await adminDb.transact([
                    adminDb.tx.expenses[currentExpenseId].update({ ocrStatus: 'failed' })
                ]);
            } catch (e) {
                // Ignore
            }
        }
        return NextResponse.json({ error: "OCR processing failed", details: error.message }, { status: 500 });
    }
}
