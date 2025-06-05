import { Router, Request, Response } from 'express';
import { listUploadedFiles } from '../utils/s3';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AlbumItem } from '../types'; // Assuming AlbumItem is defined in types.ts

const router = Router();

// Path to the metadata file (assuming it's in the same directory as media.ts)
const METADATA_FILE = path.join(__dirname, 'metadata.json');

// Helper function to read metadata
const readMetadata = async () => {
  try {
    const data = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid JSON, return empty object
    return {};
  }
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // List files from S3
    const s3Items = await listUploadedFiles();

    // Read metadata from JSON file
    const metadata = await readMetadata();

    // Combine S3 data with metadata
    const combinedItems: AlbumItem[] = s3Items.map(item => ({
        ...item,
        title: metadata[item.id]?.title || '', // Use saved title or default
        uploader_name: metadata[item.id]?.uploader_name || 'אורח אנונימי', // Use saved uploader name or default
        // created_date is already part of AlbumItem from listUploadedFiles
        // thumbnail_url is not stored in metadata.json, will be handled client-side or derived
    }));

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = combinedItems.slice(start, end);

    res.json({
      items: paginated,
      page,
      limit,
      total: combinedItems.length,
      hasMore: end < combinedItems.length,
    });
  } catch (error) {
    console.error('Error listing uploaded files:', error);
    res.status(500).json({
      code: 'LIST_FILES_ERROR',
      message: 'Failed to retrieve uploaded files.',
    });
  }
});

export default router;