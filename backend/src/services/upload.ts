import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';

if (config.cloudinary.cloudName && config.cloudinary.apiKey) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

export async function uploadImage(
  buffer: Buffer,
  folder: string
): Promise<string> {
  if (!config.cloudinary.cloudName) {
    return `https://placehold.co/600x600?text=${folder}`;
  }
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (err, result) => {
        if (err) reject(err);
        else resolve(result!.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

export async function uploadFromUrl(url: string, folder: string): Promise<string> {
  if (!config.cloudinary.cloudName) return url;
  const result = await cloudinary.uploader.upload(url, { folder });
  return result.secure_url;
}
