import { Router } from 'express';
import {
  getDashboardStats,
  getDashboardCharts,
  getDashboardActivities
} from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/charts', getDashboardCharts);
router.get('/activities', getDashboardActivities);

export default router;
