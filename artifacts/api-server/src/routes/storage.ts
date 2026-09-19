import { Router, type IRouter, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { RequestUploadUrlBody } from '@workspace/api-zod';
import { ObjectStorageService, ObjectNotFoundError } from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const uploadsDir = path.resolve(process.cwd(), '.data', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

/**
 * POST /storage/upload-direct
 * Direct file upload handler
 */
router.post('/storage/upload-direct', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  const fileId = `${randomUUID()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const targetPath = path.join(uploadsDir, fileId);
  fs.writeFileSync(targetPath, req.file.buffer);

  const objectPath = `/objects/uploads/${fileId}`;
  res.json({
    uploadURL: '',
    objectPath,
    metadata: {
      name: req.file.originalname,
      size: req.file.size,
      contentType: req.file.mimetype,
    },
  });
});

/**
 * POST /storage/uploads/request-url
 * Returns upload URL (cloud presigned or local fallback)
 */
router.post('/storage/uploads/request-url', async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Missing or invalid required fields' });
    return;
  }

  const { name, size, contentType } = parsed.data;

  try {
    // Attempt cloud presigned URL
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({
      uploadURL,
      objectPath,
      metadata: { name, size, contentType },
    });
  } catch {
    // Local storage fallback
    const fileId = `${randomUUID()}-${name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const objectPath = `/objects/uploads/${fileId}`;
    const uploadURL = `/api/storage/local-upload/${fileId}`;

    res.json({
      uploadURL,
      objectPath,
      metadata: { name, size, contentType },
    });
  }
});

/**
 * PUT /storage/local-upload/:fileId
 * Receive stream directly for presigned fallback
 */
router.put('/storage/local-upload/:fileId', (req: Request, res: Response) => {
  const rawFileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
  const fileId = path.basename(rawFileId);
  const targetPath = path.join(uploadsDir, fileId);
  const writeStream = fs.createWriteStream(targetPath);

  req.pipe(writeStream);
  writeStream.on('finish', () => {
    res.status(200).json({ status: 'uploaded', fileId });
  });
  writeStream.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

/**
 * GET /storage/objects/*path
 * Serve uploaded objects
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const filename = path.basename(wildcardPath);

    // Check local filesystem first
    const localPath = path.join(uploadsDir, filename);
    if (fs.existsSync(localPath)) {
      res.sendFile(localPath);
      return;
    }

    // Fall back to cloud storage
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = require('stream').Readable.fromWeb(response.body);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
