# Multi-tenant Smart CRM — HANDOFF

Give this file + the project zip + the original prompt to any Claude account.
Say: "Continue from HANDOFF.md. Do NOT re-analyse. Do the next unchecked file only, save it to outputs with its original path, tick it here."

Project (original zip layout): `website-main/backend`, `website-main/frontend`. Backend uses ESM (`.js` import suffixes), Express 4, Prisma 5.

## Locked design decisions (do not revisit)

1. Tenant column `organizationId String?` (nullable on purpose, so existing data survives `db push`). Backfill script fills it. Notifications are tenant-scoped through `userId` (no column).
2. Hierarchy: `User.managerId` self-relation (only SALES_EXECUTIVE has one). Teams = manager + users where `managerId = manager.id`.
3. `authenticate` loads user from DB each request -> `req.user: AuthUser` {userId,email,name,role,organizationId,managerId}. Token is NEVER trusted for org/role. Frontend-sent organizationId/managerId is ignored.
4. All controllers build `where` ONLY from `services/scope.service.ts` (`customerScope, leadScope, dealScope, taskScope, meetingScope, activityScope, userScope`) and use `findFirst({ where: { id, ...scope } })` (never `findUnique({id})`) -> no IDOR. 404 (not 403) for out-of-scope ids.
5. Assigning work: `canAssignTo(actor, targetId)`. Linking related records: `assertRelatedInScope`.
6. Enums kept to protect data: TaskStatus stays PENDING/IN_PROGRESS/COMPLETED (UI label PENDING = "To Do"; OVERDUE is COMPUTED: dueDate < now && status != COMPLETED). DealStage: DISCOVERY shown as "New"; NEEDS_ANALYSIS added (additive). LeadStage kept (NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST): WON shown as "Converted". Renaming enum values would need a data migration -> reported as limitation.
7. VIEWER removed from enum. Register = create Organisation + first ADMIN. No public role selector.
8. Do not run migrate reset / db seed. `prisma/seed.ts` is outside `src/`, not compiled by `npm run build`.

## DB rollout (user runs locally, in order)

```
-- 1) psql: existing VIEWERs must be converted first, else enum removal fails
UPDATE "User" SET role = 'SALES_EXECUTIVE' WHERE role = 'VIEWER';
-- 2)
cd backend && npx prisma db push && npx prisma generate
-- 3)
npx tsx prisma/backfill-tenancy.ts
```

## Backend checklist

- [x] prisma/schema.prisma
- [x] prisma/backfill-tenancy.ts
- [x] src/types/index.ts
- [x] src/middleware/auth.ts
- [x] src/services/activity.service.ts
- [x] src/services/scope.service.ts
- [x] src/controllers/auth.controller.ts (register body: organizationName,name,email,password,confirmPassword; response user has organizationId,managerId,organization{id,name}; reset-password now REQUIRES {token,password}; forgot-password returns demoResetToken only when NODE_ENV!=production)
- [x] src/routes/auth.routes.ts
- [x] src/controllers/employee.controller.ts + routes/employee.routes.ts (create body REQUIRES password >=8; role MANAGER|SALES_EXECUTIVE; managerId optional; GET /employees?assignable=true = users the caller may assign work to; PUT accepts role/managerId/status(ACTIVE|SUSPENDED)/password; /performance adds expectedRevenue, openDealsCount, overdueTasksCount, status, managerId)
- [x] src/controllers/customer.controller.ts + routes/customer.routes.ts (create/update schemas have NO defaults; assignedToId validated with canAssignTo; GET /:id returns extra `timeline` of activities; CSV import capped 500 rows; duplicate email -> 409)
- [ ] src/controllers/lead.controller.ts
- [ ] src/controllers/deal.controller.ts (nextStep, description, metrics: pipeline value, expected revenue = value\*probability/100, win rate, closed won; assign/reassign + notification + activity)
- [ ] src/controllers/task.controller.ts (leadId/dealId, computed overdue, assign/reassign notification)
- [ ] src/controllers/calendar.controller.ts
- [ ] src/controllers/dashboard.controller.ts (role-aware + `needsAttention` from real conditions)
- [ ] src/controllers/report.controller.ts
- [ ] src/controllers/profile.controller.ts (add organization name)
- [ ] src/controllers/notification.controller.ts (already user-scoped; verify only)
- [ ] `npm run build` in backend (needs `prisma generate` first; sandbox had no network, so build was NOT verified yet)

## Frontend checklist

- [ ] src/types/index.ts (remove VIEWER, add organizationId/managerId/nextStep/description, needsAttention types)
- [ ] src/services/api.ts (employeeService, dashboard needsAttention, register payload)
- [ ] src/context/AuthContext.tsx (remove isViewer)
- [ ] src/config/roleAccess.ts (remove VIEWER nav)
- [ ] src/pages/auth/RegisterPage.tsx (Create Organisation form)
- [ ] src/pages/EmployeesPage.tsx (real employee management)
- [ ] src/App.tsx
- [ ] src/pages/DashboardPage.tsx (role-aware + Needs Attention)
- [ ] src/pages/CustomersPage.tsx (autofocus, Tab order, Enter submit, validation)
- [ ] src/pages/LeadsPage.tsx, DealsPage.tsx, TasksPage.tsx (assign/reassign, search/filter)
- [ ] `npm run build` in frontend

## Final report format

Files modified / Backend / Frontend / Database / Security-RBAC / Build results / Remaining limitations. Only claim what was verified.
