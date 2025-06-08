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
  title?: string,
  uploaderName?: string
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

  // Prepare metadata for S3 object
  const objectMetadata: Record<string, string> = {
    original_filename: encodeURIComponent(filename), // Store original filename
    created_date: new Date().toISOString(), // Add creation date
  };
  if (title) objectMetadata.title = encodeURIComponent(title);
  if (uploaderName) objectMetadata.uploader_name = encodeURIComponent(uploaderName);
  
  // Create the command with metadata
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: filetype,
    Metadata: objectMetadata,
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

  const items: AlbumItem[] = [];

  // Fetch metadata for each item concurrently
  await Promise.all(sorted.map(async (item) => {
    const key = item.Key!;
    const url = `${baseUrl}${key}`;
    const id = key;
    const ext = id.split('.').pop()?.toLowerCase() ?? '';

    const type: AlbumItem['type'] = videoExtensions.includes(ext) ? 'video' : 'image';
    
    // Fetch object metadata
    let itemMetadata: Record<string, string> = {};
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      });
      const headResponse = await s3Client.send(headCommand);
      if (headResponse.Metadata) {
        // Decode URI components as they were encoded when uploaded
        itemMetadata = Object.fromEntries(
          Object.entries(headResponse.Metadata).map(([k, v]) => [
            k, decodeURIComponent(v)
          ])
        );
      }
    } catch (headError) {
      console.error(`Error fetching metadata for ${key}:`, headError);
    }

    items.push({
      id,
      url,
      type,
      created_date: itemMetadata.created_date || item.LastModified!.toISOString(),
      title: itemMetadata.title || '',
      uploader_name: itemMetadata.uploader_name || 'אורח אנונימי',
    });
  }));

  // Sort items by created_date after fetching metadata (to ensure proper sorting)
  return items.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

  
};