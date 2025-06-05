import dotenv from 'dotenv';
dotenv.config();

import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { allowedTypes } from '../constants/allowedTypes';
import { AlbumItem } from '../types';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface UploadUrlResponse {
  url: string;
  key: string;
}

export const generateUploadUrl = async (
  filename: string,
  filetype: string,
  filesize: number
): Promise<UploadUrlResponse> => {
  // Validate file type
  if (!allowedTypes.includes(filetype)) {
    throw {
      status: 400,
      code: 'UNSUPPORTED_FILE_TYPE',
      message: 'Invalid file type. Only images and videos are allowed.'
    };
  }

  // Validate file size (10MB limit)
  const MAX_FILE_SIZE = 350 * 1024 * 1024; // 350MB in bytes
  if (filesize > MAX_FILE_SIZE) {
    throw {
      status: 400,
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds 350MB limit.'
    };
  }

  // Generate unique filename
  const extension = filename.split('.').pop();
  const uniqueFilename = `${uuidv4()}.${extension}`;
  const key = `wedding-uploads/${uniqueFilename}`;

  // Create the command
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: filetype,
  });

  // Generate pre-signed URL (expires in 15 minutes)
  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return {
    url,
    key,
  };
};

const videoExtensions = ['mp4', 'mov', 'webm', 'quicktime', 'hevc', '3gpp', 'x-matroska','video'];

export const listUploadedFiles = async (): Promise<AlbumItem[]> => {
  const command = new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET_NAME,
    Prefix: 'wedding-uploads/',
  });

  const response = await s3Client.send(command);
  const baseUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;

  const sorted = (response.Contents ?? []).sort((a, b) => {
    const aTime = a.LastModified?.getTime() ?? 0;
    const bTime = b.LastModified?.getTime() ?? 0;
    return bTime - aTime;
  });

  const items: AlbumItem[] = sorted.map((item) => {
    const key = item.Key!;
    const url = `${baseUrl}${key}`;
    const id = key;
    const ext = id.split('.').pop()?.toLowerCase() ?? '';

    const type: AlbumItem['type'] = videoExtensions.includes(ext) ? 'video' : 'image';

    return { id, url, type, created_date: item.LastModified?.toISOString() };
  });

  return items;
};