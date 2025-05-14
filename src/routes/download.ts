import { Router, Request, Response } from 'express';
import { listUploadedFiles } from '../utils/s3';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const items = await listUploadedFiles();
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = items.slice(start, end);

    res.json({
      items: paginated,
      page,
      limit,
      total: items.length,
      hasMore: end < items.length,
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