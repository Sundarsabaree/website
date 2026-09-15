import { Router } from 'express';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  taskSchema
} from '../controllers/task.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getTasks);
router.post('/', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), validateBody(taskSchema), createTask);
router.put('/:id', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), validateBody(taskSchema.partial()), updateTask);
router.delete('/:id', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), deleteTask);

export default router;
