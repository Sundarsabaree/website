import { Router } from "express";
import {
  getReportsAnalytics,
  exportReportCsv,
} from "../controllers/report.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

router.get("/analytics", getReportsAnalytics);
router.get(
  "/export-csv",
  authorize([Role.ADMIN, Role.MANAGER]),
  exportReportCsv,
);

export default router;
