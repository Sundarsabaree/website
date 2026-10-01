import { Router } from "express";
import {
  getDashboardStats,
  getDashboardCharts,
  getDashboardActivities,
  getTeamPerformance,
  getNeedsAttention,
} from "../controllers/dashboard.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

router.get("/stats", getDashboardStats);
router.get("/charts", getDashboardCharts);
router.get("/activities", getDashboardActivities);
router.get("/needs-attention", getNeedsAttention);
router.get(
  "/team-performance",
  authorize([Role.ADMIN, Role.MANAGER]),
  getTeamPerformance,
);

export default router;
