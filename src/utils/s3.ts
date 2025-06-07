import dotenv from 'dotenv';
dotenv.config();

import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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
  filesize: number,
  metadata?: Record<string, string>
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

  // Create the command with metadata
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: filetype,
    Metadata: metadata || {},
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

  // Read all metadata from the JSON file
  const allMetadata = await readMetadata();

  const items: AlbumItem[] = sorted.map((item) => {
    const key = item.Key!;
    const url = `${baseUrl}${key}`;
    const id = key;
    const ext = id.split('.').pop()?.toLowerCase() ?? '';

    const type: AlbumItem['type'] = videoExtensions.includes(ext) ? 'video' : 'image';
    
    // Get metadata from the allMetadata object
    const itemMetadata = allMetadata[key] || {};

    return {
      id,
      url,
      type,
      created_date: itemMetadata.created_date || item.LastModified?.toISOString(),
      title: itemMetadata.title || '',
      uploader_name: itemMetadata.uploader_name || 'אורח אנונימי',
    };
  });

  return items;
};

// Helper function to read metadata from S3
export const readMetadata = async (): Promise<Record<string, any>> => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'metadata.json',
    });

    const response = await s3Client.send(command);
    const metadataStr = await response.Body?.transformToString();
    return metadataStr ? JSON.parse(metadataStr) : {};
  } catch (error) {
    // If file doesn't exist or is invalid JSON, return empty object
    return {};
  }
};

// Helper function to write metadata to S3 with retry logic
export const writeMetadata = async (metadata: Record<string, any>): Promise<void> => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Read the latest metadata first to handle concurrent writes
      const currentMetadata = await readMetadata();
      
      // Merge the new metadata with existing metadata
      const mergedMetadata = {
        ...currentMetadata,
        ...metadata
      };

      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: 'metadata.json',
        Body: JSON.stringify(mergedMetadata, null, 2),
        ContentType: 'application/json',
      });

      await s3Client.send(command);
      return;
    } catch (error) {
      retryCount++;
      if (retryCount === maxRetries) {
        throw error;
      }
      // Wait for a short time before retrying
      await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
    }
  }
};