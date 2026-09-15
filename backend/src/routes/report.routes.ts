import { Router } from 'express';
import {
  getReportsAnalytics,
  exportReportCsv
} from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/analytics', getReportsAnalytics);
router.get('/export-csv', exportReportCsv);

export default router;
