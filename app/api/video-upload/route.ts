import { v2 as cloudinary, UploadStream } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  public_id: string;
  bytes: number;
  duration?: number;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    if (
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return new NextResponse("Cloudinary credentials not found", {
        status: 500,
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const originalSize = formData.get("originalSize") as string | ""; // null->""
    const title = formData.get("title") as string | "";
    const description = formData.get("description") as string | "";

    if (!file) {
      return new NextResponse("No file found uploaded", { status: 400 });
    }

    const bytes = await file.arrayBuffer(); // reads the file's raw binary data into memory as an ArrayBuffer.
    const buffer = Buffer.from(bytes); //converts that ArrayBuffer into a Node.js Buffer for easier manipulation or processing.

    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "video-uploads",
            resource_type: "video",
            transformation: [
              {
                quality: "auto",
                fetch_format: "mp4",
              },
            ],
          },

          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result as CloudinaryUploadResult);
            }
          }
        );
        uploadStream.end(buffer);
      }
    );

    const video = await prisma.video.create({
      data: {
        title,
        description,
        publicId: result.public_id,
        originalSize,
        compressedSize: String(result.bytes),
        duration: result.duration || 0,
      },
    });
    return NextResponse.json(video);
  } catch (error) {
    console.log("uplaod Video failed :", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
