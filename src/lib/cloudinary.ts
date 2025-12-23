/**
 * Cloudinary Upload Utility
 */

export interface CloudinaryUploadResult {
    secure_url: string;
    public_id: string;
    resource_type: string;
}

export async function uploadToCloudinary(
    file: File,
    folder: string
): Promise<CloudinaryUploadResult> {
    // 1. Get signature from our API
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
        timestamp,
        folder,
    };

    const signResponse = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paramsToSign }),
    });

    if (!signResponse.ok) {
        throw new Error("Failed to get upload signature");
    }

    const { signature, apiKey, cloudName } = await signResponse.json();
    if (!signature || !apiKey || !cloudName) {
        throw new Error("Invalid response from signature endpoint");
    }

    // 2. Upload to Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);

    const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error?.message || "Cloudinary upload failed");
    }

    return uploadResponse.json();
}

export async function deleteFromCloudinary(publicId: string) {
    const response = await fetch("/api/cloudinary/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
        throw new Error("Failed to delete from Cloudinary");
    }

    return response.json();
}
