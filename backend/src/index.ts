import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error.js';

// Route Imports
import authRoutes from './routes/auth.routes.js';
import customerRoutes from './routes/customer.routes.js';
import leadRoutes from './routes/lead.routes.js';
import dealRoutes from './routes/deal.routes.js';
import taskRoutes from './routes/task.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportRoutes from './routes/report.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import profileRoutes from './routes/profile.routes.js';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requests per 15 mins for development/enterprise usage
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', apiLimiter);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Enterprise Smart CRM API',
    database: 'PostgreSQL'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);

// Centralized Error Handling
app.use(errorHandler);

// Start Server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Smart CRM API server running on http://localhost:${PORT}`);
});

export default app;
