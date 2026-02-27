# Assets & Service Requests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an asset inventory (hardware + software, `AST-XXXX`) and service request module (`REQ-XXXX`) with full lifecycle management, linked to users and incidents, plus a user profile summary page.

**Architecture:** Five new DB tables (`assets`, `assetHistory`, `serviceRequests`, `serviceRequestComments`, `assetLinks`) with new API routes and dashboard pages. Follows existing Next.js App Router + Drizzle ORM patterns exactly — each API route uses `requireAuth`/`requireRole` from `lib/api-error.ts`, `hasRole` from `lib/rbac.ts`, and Zod validators from `lib/validators.ts`.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + PostgreSQL, Zod, React 19, Heroicons, Tailwind CSS, Playwright E2E

---

### Task 1: Schema — add 5 new tables

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: Add new imports to the top of schema.ts**

The current first line is:
```ts
import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
```

Change to:
```ts
import { pgTable, serial, text, integer, boolean, timestamp, numeric } from 'drizzle-orm/pg-core';
```

**Step 2: Append the 5 new tables before the `// Type exports` comment (line 337)**

```ts
// Assets table
export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  assetTag: text('asset_tag').notNull().unique(), // e.g. AST-0001
  name: text('name').notNull(),
  type: text('type', { enum: ['Hardware', 'Software'] }).notNull(),
  make: text('make'),
  model: text('model'),
  serialNumber: text('serial_number'), // hardware serial OR software license key
  status: text('status', { enum: ['Active', 'In Repair', 'Retired'] }).notNull().default('Active'),
  location: text('location'),
  purchaseDate: timestamp('purchase_date'),
  warrantyExpiry: timestamp('warranty_expiry'),
  cost: numeric('cost', { precision: 10, scale: 2 }), // e.g. "1299.99"
  assignedUserId: integer('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// Asset assignment history
export const assetHistory = pgTable('asset_history', {
  id: serial('id').primaryKey(),
  assetId: integer('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  assignedToUserId: integer('assigned_to_user_id').references(() => users.id, { onDelete: 'set null' }),
  assignedByUserId: integer('assigned_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at').notNull().default(sql`now()`),
  returnedAt: timestamp('returned_at'),
  notes: text('notes')
});

// Service Requests table (REQ-XXXX)
export const serviceRequests = pgTable('service_requests', {
  id: serial('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(), // e.g. REQ-0001
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category', {
    enum: ['New Equipment', 'Software Access', 'Account Setup', 'Hardware Repair', 'Other']
  }).notNull(),
  status: text('status', {
    enum: ['Submitted', 'Approved', 'In Progress', 'Fulfilled', 'Rejected']
  }).notNull().default('Submitted'),
  priority: text('priority', { enum: ['P1', 'P2', 'P3', 'P4'] }).notNull().default('P3'),
  requesterId: integer('requester_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  assignedAgentId: integer('assigned_agent_id').references(() => users.id, { onDelete: 'set null' }),
  approvedById: integer('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at'),
  fulfilledAt: timestamp('fulfilled_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// Service Request Comments
export const serviceRequestComments = pgTable('service_request_comments', {
  id: serial('id').primaryKey(),
  serviceRequestId: integer('service_request_id').notNull().references(() => serviceRequests.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`)
});

// Asset ↔ Ticket/ServiceRequest links
export const assetLinks = pgTable('asset_links', {
  id: serial('id').primaryKey(),
  assetId: integer('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
  serviceRequestId: integer('service_request_id').references(() => serviceRequests.id, { onDelete: 'cascade' }),
  linkedByUserId: integer('linked_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  linkedAt: timestamp('linked_at').notNull().default(sql`now()`)
});
```

**Step 3: Append type exports after the existing type exports block**

```ts
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AssetHistory = typeof assetHistory.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type NewServiceRequest = typeof serviceRequests.$inferInsert;
export type ServiceRequestComment = typeof serviceRequestComments.$inferSelect;
export type AssetLink = typeof assetLinks.$inferSelect;
```

**Step 4: Generate and run migration**

```bash
npm run db:generate
npm run db:migrate
```

Expected: new migration file created in `lib/db/migrations/` and applied with no errors.

**Step 5: Verify build**

```bash
npm run build
```

Expected: TypeScript compilation succeeds, no errors.

**Step 6: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations/
git commit -m "feat(schema): add assets, assetHistory, serviceRequests, serviceRequestComments, assetLinks tables"
```

---

### Task 2: Validators — add Zod schemas

**Files:**
- Modify: `lib/validators.ts`

**Step 1: Append these schemas at the end of the file (before type exports)**

```ts
// Asset schemas
export const createAssetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.enum(['Hardware', 'Software']),
  make: z.string().max(100).optional(),
  model: z.string().max(200).optional(),
  serialNumber: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  purchaseDate: z.string().datetime().optional().nullable(),
  warrantyExpiry: z.string().datetime().optional().nullable(),
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost format').optional().nullable(),
  assignedUserId: z.number().int().positive().optional().nullable()
});
export const updateAssetSchema = createAssetSchema.partial();
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const assignAssetSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  notes: z.string().max(500).optional()
});
export type AssignAssetInput = z.infer<typeof assignAssetSchema>;

// Service Request schemas
export const createServiceRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  category: z.enum(['New Equipment', 'Software Access', 'Account Setup', 'Hardware Repair', 'Other']),
  priority: z.enum(['P1', 'P2', 'P3', 'P4']).default('P3')
});
export const updateServiceRequestSchema = createServiceRequestSchema.partial();
export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type UpdateServiceRequestInput = z.infer<typeof updateServiceRequestSchema>;

export const serviceRequestStatusSchema = z.object({
  status: z.enum(['Approved', 'In Progress', 'Fulfilled', 'Rejected', 'Submitted']),
  rejectionReason: z.string().min(1).max(1000).optional()
}).refine(
  data => data.status !== 'Rejected' || !!data.rejectionReason,
  { message: 'Rejection reason is required when rejecting', path: ['rejectionReason'] }
);
export type ServiceRequestStatusInput = z.infer<typeof serviceRequestStatusSchema>;

export const assignServiceRequestSchema = z.object({
  agentId: z.number().int().positive('Agent ID is required')
});
export type AssignServiceRequestInput = z.infer<typeof assignServiceRequestSchema>;

export const addServiceRequestCommentSchema = z.object({
  body: z.string().min(1).max(5000)
});
export type AddServiceRequestCommentInput = z.infer<typeof addServiceRequestCommentSchema>;
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

**Step 3: Commit**

```bash
git add lib/validators.ts
git commit -m "feat(validators): add asset and service request Zod schemas"
```

---

### Task 3: Assets API — GET + POST `/api/assets`

**Files:**
- Create: `app/api/assets/route.ts`

**Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assets, users } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { createAssetSchema } from '@/lib/validators';

// GET /api/assets
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);
    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const rows = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        name: assets.name,
        type: assets.type,
        make: assets.make,
        model: assets.model,
        status: assets.status,
        location: assets.location,
        cost: assets.cost,
        purchaseDate: assets.purchaseDate,
        warrantyExpiry: assets.warrantyExpiry,
        createdAt: assets.createdAt,
        assignedUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(assets)
      .leftJoin(users, eq(assets.assignedUserId, users.id))
      .where(
        !isAgent
          ? eq(assets.assignedUserId, userId)
          : sql`1=1`
      )
      .orderBy(desc(assets.createdAt));

    const filtered = rows
      .filter(a => !type || a.type === type)
      .filter(a => !status || a.status === status);

    return NextResponse.json({ assets: filtered });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/assets
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);

    const body = await req.json();
    const data = createAssetSchema.parse(body);

    // Generate asset tag
    const countResult = await db.select({ id: assets.id }).from(assets);
    const sequence = String(countResult.length + 1).padStart(4, '0');
    const assetTag = `AST-${sequence}`;

    const [asset] = await db
      .insert(assets)
      .values({
        assetTag,
        name: data.name,
        type: data.type,
        make: data.make ?? null,
        model: data.model ?? null,
        serialNumber: data.serialNumber ?? null,
        location: data.location ?? null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        cost: data.cost ?? null,
        assignedUserId: data.assignedUserId ?? parseInt(session!.user.id, 10),
        status: 'Active'
      })
      .returning();

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

**Step 3: Commit**

```bash
git add app/api/assets/route.ts
git commit -m "feat(api): GET/POST /api/assets — asset list and create"
```

---

### Task 4: Assets API — detail, update, assign, retire

**Files:**
- Create: `app/api/assets/[id]/route.ts`
- Create: `app/api/assets/[id]/assign/route.ts`
- Create: `app/api/assets/[id]/retire/route.ts`

**Step 1: Create `app/api/assets/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assets, assetHistory, assetLinks, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { updateAssetSchema } from '@/lib/validators';

async function getAsset(id: number) {
  const [asset] = await db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      name: assets.name,
      type: assets.type,
      make: assets.make,
      model: assets.model,
      serialNumber: assets.serialNumber,
      status: assets.status,
      location: assets.location,
      cost: assets.cost,
      purchaseDate: assets.purchaseDate,
      warrantyExpiry: assets.warrantyExpiry,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
      assignedUserId: assets.assignedUserId,
      assignedUser: {
        id: users.id,
        fullName: users.fullName,
        email: users.email
      }
    })
    .from(assets)
    .leftJoin(users, eq(assets.assignedUserId, users.id))
    .where(eq(assets.id, id))
    .limit(1);
  return asset ?? null;
}

// GET /api/assets/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const assetId = parseInt(id, 10);
    if (isNaN(assetId)) throw new APIError(400, 'bad_request', 'Invalid asset ID');

    const asset = await getAsset(assetId);
    if (!asset) throw new APIError(404, 'not_found', 'Asset not found');

    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');
    if (!isAgent && asset.assignedUserId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    // Fetch history
    const history = await db
      .select({
        id: assetHistory.id,
        assignedAt: assetHistory.assignedAt,
        returnedAt: assetHistory.returnedAt,
        notes: assetHistory.notes,
        assignedTo: { id: users.id, fullName: users.fullName }
      })
      .from(assetHistory)
      .leftJoin(users, eq(assetHistory.assignedToUserId, users.id))
      .where(eq(assetHistory.assetId, assetId))
      .orderBy(desc(assetHistory.assignedAt));

    return NextResponse.json({ asset, history });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/assets/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const assetId = parseInt(id, 10);
    if (isNaN(assetId)) throw new APIError(400, 'bad_request', 'Invalid asset ID');

    const asset = await getAsset(assetId);
    if (!asset) throw new APIError(404, 'not_found', 'Asset not found');

    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');
    if (!isAgent && asset.assignedUserId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    const body = await req.json();
    const data = updateAssetSchema.parse(body);

    const [updated] = await db
      .update(assets)
      .set({
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        updatedAt: new Date()
      })
      .where(eq(assets.id, assetId))
      .returning();

    return NextResponse.json({ asset: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 2: Create `app/api/assets/[id]/assign/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assets, assetHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';
import { assignAssetSchema } from '@/lib/validators';

// POST /api/assets/[id]/assign
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const assetId = parseInt(id, 10);
    if (isNaN(assetId)) throw new APIError(400, 'bad_request', 'Invalid asset ID');

    const [existing] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Asset not found');
    if (existing.status === 'Retired') throw new APIError(400, 'bad_request', 'Cannot assign a retired asset');

    const body = await req.json();
    const data = assignAssetSchema.parse(body);
    const agentId = parseInt(session!.user.id, 10);

    // Close previous history entry if any
    if (existing.assignedUserId) {
      await db
        .update(assetHistory)
        .set({ returnedAt: new Date() })
        .where(eq(assetHistory.assetId, assetId));
    }

    // Create new history entry
    await db.insert(assetHistory).values({
      assetId,
      assignedToUserId: data.userId,
      assignedByUserId: agentId,
      notes: data.notes ?? null
    });

    const [updated] = await db
      .update(assets)
      .set({ assignedUserId: data.userId, updatedAt: new Date() })
      .where(eq(assets.id, assetId))
      .returning();

    return NextResponse.json({ asset: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 3: Create `app/api/assets/[id]/retire/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';

// POST /api/assets/[id]/retire
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const assetId = parseInt(id, 10);
    if (isNaN(assetId)) throw new APIError(400, 'bad_request', 'Invalid asset ID');

    const [existing] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Asset not found');
    if (existing.status === 'Retired') throw new APIError(400, 'bad_request', 'Asset is already retired');

    const [updated] = await db
      .update(assets)
      .set({ status: 'Retired', assignedUserId: null, updatedAt: new Date() })
      .where(eq(assets.id, assetId))
      .returning();

    return NextResponse.json({ asset: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 4: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

**Step 5: Commit**

```bash
git add app/api/assets/
git commit -m "feat(api): GET/PATCH /api/assets/[id] + assign + retire endpoints"
```

---

### Task 5: Service Requests API — GET + POST `/api/service-requests`

**Files:**
- Create: `app/api/service-requests/route.ts`

**Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequests, users } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { createServiceRequestSchema } from '@/lib/validators';

// GET /api/service-requests
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);
    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const rows = await db
      .select({
        id: serviceRequests.id,
        requestNumber: serviceRequests.requestNumber,
        title: serviceRequests.title,
        category: serviceRequests.category,
        status: serviceRequests.status,
        priority: serviceRequests.priority,
        createdAt: serviceRequests.createdAt,
        updatedAt: serviceRequests.updatedAt,
        approvedAt: serviceRequests.approvedAt,
        fulfilledAt: serviceRequests.fulfilledAt,
        requesterId: serviceRequests.requesterId,
        requester: { id: users.id, fullName: users.fullName, email: users.email }
      })
      .from(serviceRequests)
      .leftJoin(users, eq(serviceRequests.requesterId, users.id))
      .where(!isAgent ? eq(serviceRequests.requesterId, userId) : sql`1=1`)
      .orderBy(desc(serviceRequests.createdAt));

    const filtered = rows
      .filter(r => !status || r.status === status)
      .filter(r => !category || r.category === category);

    return NextResponse.json({ serviceRequests: filtered });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/service-requests
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);

    const body = await req.json();
    const data = createServiceRequestSchema.parse(body);

    // Generate request number
    const countResult = await db.select({ id: serviceRequests.id }).from(serviceRequests);
    const sequence = String(countResult.length + 1).padStart(4, '0');
    const requestNumber = `REQ-${sequence}`;

    const [req_] = await db
      .insert(serviceRequests)
      .values({
        requestNumber,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        requesterId: parseInt(session!.user.id, 10),
        status: 'Submitted'
      })
      .returning();

    return NextResponse.json({ serviceRequest: req_ }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/api/service-requests/route.ts
git commit -m "feat(api): GET/POST /api/service-requests"
```

---

### Task 6: Service Requests API — detail + update

**Files:**
- Create: `app/api/service-requests/[id]/route.ts`

**Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequests, serviceRequestComments, users, assetLinks, assets } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { updateServiceRequestSchema } from '@/lib/validators';

async function getSR(id: number) {
  const [row] = await db
    .select({
      id: serviceRequests.id,
      requestNumber: serviceRequests.requestNumber,
      title: serviceRequests.title,
      description: serviceRequests.description,
      category: serviceRequests.category,
      status: serviceRequests.status,
      priority: serviceRequests.priority,
      rejectionReason: serviceRequests.rejectionReason,
      requesterId: serviceRequests.requesterId,
      assignedAgentId: serviceRequests.assignedAgentId,
      approvedAt: serviceRequests.approvedAt,
      fulfilledAt: serviceRequests.fulfilledAt,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt
    })
    .from(serviceRequests)
    .where(eq(serviceRequests.id, id))
    .limit(1);
  return row ?? null;
}

// GET /api/service-requests/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const sr = await getSR(srId);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session!.user.id, 10);
    if (!hasRole(session, 'Agent') && sr.requesterId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    // Requester info
    const [requester] = await db
      .select({ id: users.id, fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, sr.requesterId))
      .limit(1);

    // Assigned agent info
    let assignedAgent = null;
    if (sr.assignedAgentId) {
      const [agent] = await db
        .select({ id: users.id, fullName: users.fullName, email: users.email })
        .from(users)
        .where(eq(users.id, sr.assignedAgentId))
        .limit(1);
      assignedAgent = agent ?? null;
    }

    // Comments
    const commentRows = await db
      .select({
        id: serviceRequestComments.id,
        body: serviceRequestComments.body,
        createdAt: serviceRequestComments.createdAt,
        author: { id: users.id, fullName: users.fullName, role: users.role }
      })
      .from(serviceRequestComments)
      .innerJoin(users, eq(serviceRequestComments.authorId, users.id))
      .where(eq(serviceRequestComments.serviceRequestId, srId))
      .orderBy(asc(serviceRequestComments.createdAt));

    // Linked assets
    const linkedAssets = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        name: assets.name,
        type: assets.type,
        status: assets.status
      })
      .from(assetLinks)
      .innerJoin(assets, eq(assetLinks.assetId, assets.id))
      .where(eq(assetLinks.serviceRequestId, srId));

    return NextResponse.json({ serviceRequest: { ...sr, requester, assignedAgent }, comments: commentRows, linkedAssets });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/service-requests/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const sr = await getSR(srId);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session!.user.id, 10);
    if (!hasRole(session, 'Agent') && sr.requesterId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    // Only allow edits while Submitted
    if (!hasRole(session, 'Agent') && sr.status !== 'Submitted') {
      throw new APIError(400, 'bad_request', 'Cannot edit a request that is no longer Submitted');
    }

    const body = await req.json();
    const data = updateServiceRequestSchema.parse(body);

    const [updated] = await db
      .update(serviceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceRequests.id, srId))
      .returning();

    return NextResponse.json({ serviceRequest: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/api/service-requests/[id]/route.ts
git commit -m "feat(api): GET/PATCH /api/service-requests/[id] — detail and update"
```

---

### Task 7: Service Requests API — status transitions

**Files:**
- Create: `app/api/service-requests/[id]/status/route.ts`

**Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { serviceRequestStatusSchema } from '@/lib/validators';

// Valid transitions map
const VALID_TRANSITIONS: Record<string, string[]> = {
  Submitted: ['Approved', 'Rejected'],
  Approved: ['In Progress', 'Rejected'],
  'In Progress': ['Fulfilled', 'Rejected'],
  Fulfilled: [],
  Rejected: []
};

// POST /api/service-requests/[id]/status
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [sr] = await db
      .select({ id: serviceRequests.id, status: serviceRequests.status, requesterId: serviceRequests.requesterId })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, srId))
      .limit(1);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');

    const body = await req.json();
    const data = serviceRequestStatusSchema.parse(body);

    // Requester can only cancel (set back to Submitted — not implemented here; just block non-agents)
    if (!isAgent && !(sr.requesterId === userId && data.status === 'Submitted')) {
      throw new APIError(403, 'forbidden', 'Only agents can change request status');
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[sr.status] ?? [];
    if (!allowed.includes(data.status)) {
      throw new APIError(400, 'bad_request', `Cannot transition from ${sr.status} to ${data.status}`);
    }

    const agentId = parseInt(session!.user.id, 10);
    const now = new Date();

    const [updated] = await db
      .update(serviceRequests)
      .set({
        status: data.status,
        rejectionReason: data.status === 'Rejected' ? (data.rejectionReason ?? null) : null,
        approvedById: data.status === 'Approved' ? agentId : undefined,
        approvedAt: data.status === 'Approved' ? now : undefined,
        fulfilledAt: data.status === 'Fulfilled' ? now : undefined,
        updatedAt: now
      })
      .where(eq(serviceRequests.id, srId))
      .returning();

    return NextResponse.json({ serviceRequest: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/api/service-requests/[id]/status/route.ts
git commit -m "feat(api): POST /api/service-requests/[id]/status — status transitions"
```

---

### Task 8: Service Requests API — assign + comments

**Files:**
- Create: `app/api/service-requests/[id]/assign/route.ts`
- Create: `app/api/service-requests/[id]/comments/route.ts`

**Step 1: Create `app/api/service-requests/[id]/assign/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';
import { assignServiceRequestSchema } from '@/lib/validators';

// POST /api/service-requests/[id]/assign
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'TeamLead');

    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [sr] = await db.select({ id: serviceRequests.id }).from(serviceRequests).where(eq(serviceRequests.id, srId)).limit(1);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const body = await req.json();
    const data = assignServiceRequestSchema.parse(body);

    const [updated] = await db
      .update(serviceRequests)
      .set({ assignedAgentId: data.agentId, updatedAt: new Date() })
      .where(eq(serviceRequests.id, srId))
      .returning();

    return NextResponse.json({ serviceRequest: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 2: Create `app/api/service-requests/[id]/comments/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequests, serviceRequestComments, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { addServiceRequestCommentSchema } from '@/lib/validators';

// GET /api/service-requests/[id]/comments
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [sr] = await db.select({ requesterId: serviceRequests.requesterId }).from(serviceRequests).where(eq(serviceRequests.id, srId)).limit(1);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session!.user.id, 10);
    if (!hasRole(session, 'Agent') && sr.requesterId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    const rows = await db
      .select({
        id: serviceRequestComments.id,
        body: serviceRequestComments.body,
        createdAt: serviceRequestComments.createdAt,
        author: { id: users.id, fullName: users.fullName, role: users.role }
      })
      .from(serviceRequestComments)
      .innerJoin(users, eq(serviceRequestComments.authorId, users.id))
      .where(eq(serviceRequestComments.serviceRequestId, srId))
      .orderBy(asc(serviceRequestComments.createdAt));

    return NextResponse.json({ comments: rows });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/service-requests/[id]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [sr] = await db.select({ requesterId: serviceRequests.requesterId }).from(serviceRequests).where(eq(serviceRequests.id, srId)).limit(1);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session!.user.id, 10);
    if (!hasRole(session, 'Agent') && sr.requesterId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    const body = await req.json();
    const data = addServiceRequestCommentSchema.parse(body);

    const [comment] = await db
      .insert(serviceRequestComments)
      .values({ serviceRequestId: srId, body: data.body, authorId: userId })
      .returning();

    await db.update(serviceRequests).set({ updatedAt: new Date() }).where(eq(serviceRequests.id, srId));

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add app/api/service-requests/[id]/assign/ app/api/service-requests/[id]/comments/
git commit -m "feat(api): assign + comments endpoints for service requests"
```

---

### Task 9: Users summary API

**Files:**
- Create: `app/api/users/[id]/summary/route.ts`

**Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assets, tickets, serviceRequests } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { requireAuth, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';

// GET /api/users/[id]/summary
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const targetId = parseInt(id, 10);
    if (isNaN(targetId)) throw new APIError(400, 'bad_request', 'Invalid user ID');

    const sessionUserId = parseInt(session!.user.id, 10);
    // Can only view own profile or Agent+ can view anyone
    if (targetId !== sessionUserId && !hasRole(session, 'Agent')) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    const [userAssets, openTickets, openRequests] = await Promise.all([
      db
        .select({ id: assets.id, assetTag: assets.assetTag, name: assets.name, type: assets.type, status: assets.status })
        .from(assets)
        .where(eq(assets.assignedUserId, targetId)),
      db
        .select({ id: tickets.id, ticketNumber: tickets.ticketNumber, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt })
        .from(tickets)
        .where(and(eq(tickets.createdBy, targetId), ne(tickets.status, 'Closed'))),
      db
        .select({ id: serviceRequests.id, requestNumber: serviceRequests.requestNumber, title: serviceRequests.title, status: serviceRequests.status, priority: serviceRequests.priority, createdAt: serviceRequests.createdAt })
        .from(serviceRequests)
        .where(and(eq(serviceRequests.requesterId, targetId), ne(serviceRequests.status, 'Fulfilled')))
    ]);

    return NextResponse.json({ assets: userAssets, openTickets, openRequests });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/api/users/[id]/summary/route.ts
git commit -m "feat(api): GET /api/users/[id]/summary — user profile data"
```

---

### Task 10: Navigation — add Assets and Service Requests

**Files:**
- Modify: `components/layout/DashboardNav.tsx`

**Step 1: Add new icon imports**

The current import line for heroicons is:
```ts
import {
  ClipboardDocumentListIcon,
  TicketIcon,
  QueueListIcon,
  BookOpenIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
  TagIcon,
  ClockIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
```

Add `ComputerDesktopIcon` and `InboxStackIcon`:
```ts
import {
  ClipboardDocumentListIcon,
  TicketIcon,
  QueueListIcon,
  BookOpenIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
  TagIcon,
  ClockIcon,
  UsersIcon,
  ComputerDesktopIcon,
  InboxStackIcon,
} from '@heroicons/react/24/outline';
```

**Step 2: Add new items to `baseNavItems`**

Change:
```ts
const baseNavItems: NavItem[] = [
  { href: '/dashboard/issue-logging', label: 'Issue Logging', icon: ClipboardDocumentListIcon },
  { href: '/dashboard/my-tickets', label: 'My Tickets', icon: TicketIcon },
  { href: '/dashboard/all-tickets', label: 'All Tickets', icon: QueueListIcon },
  { href: '/dashboard/kb', label: 'Knowledge Base', icon: BookOpenIcon },
];
```

To:
```ts
const baseNavItems: NavItem[] = [
  { href: '/dashboard/issue-logging', label: 'Issue Logging', icon: ClipboardDocumentListIcon },
  { href: '/dashboard/my-tickets', label: 'My Tickets', icon: TicketIcon },
  { href: '/dashboard/all-tickets', label: 'All Tickets', icon: QueueListIcon },
  { href: '/dashboard/assets', label: 'Assets', icon: ComputerDesktopIcon },
  { href: '/dashboard/service-requests', label: 'Service Requests', icon: InboxStackIcon },
  { href: '/dashboard/kb', label: 'Knowledge Base', icon: BookOpenIcon },
];
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add components/layout/DashboardNav.tsx
git commit -m "feat(ui): add Assets and Service Requests to sidebar nav"
```

---

### Task 11: Assets UI — list page

**Files:**
- Create: `app/dashboard/assets/page.tsx`

**Step 1: Create the file**

```tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { assets, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { ComputerDesktopIcon, PlusIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon } from '@heroicons/react/24/solid';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  'In Repair': 'bg-amber-100 text-amber-700',
  Retired: 'bg-gray-100 text-gray-500'
};

export default async function AssetsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = parseInt(session.user.id, 10);
  const isAgent = hasRole(session, 'Agent');

  const rows = await db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      name: assets.name,
      type: assets.type,
      make: assets.make,
      model: assets.model,
      status: assets.status,
      location: assets.location,
      assignedUser: { id: users.id, fullName: users.fullName }
    })
    .from(assets)
    .leftJoin(users, eq(assets.assignedUserId, users.id))
    .where(!isAgent ? eq(assets.assignedUserId, userId) : undefined as any)
    .orderBy(desc(assets.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAgent ? 'All registered assets' : 'Your assigned assets'}
          </p>
        </div>
        <Link
          href="/dashboard/assets/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700"
        >
          <PlusIcon className="h-4 w-4" />
          Register Asset
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ComputerDesktopIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No assets found.</p>
          <Link href="/dashboard/assets/new" className="mt-3 inline-block text-sm text-violet-600 hover:underline">Register your first asset</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Tag', 'Name', 'Type', 'Make / Model', 'Status', 'Location', isAgent ? 'Assigned To' : null].filter(Boolean).map(h => (
                  <th key={h!} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(asset => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-violet-700">{asset.assetTag}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{asset.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{asset.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{[asset.make, asset.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[asset.status] ?? ''}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{asset.location || '—'}</td>
                  {isAgent && <td className="px-4 py-3 text-sm text-gray-600">{asset.assignedUser?.fullName ?? 'Unassigned'}</td>}
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/assets/${asset.id}`} className="text-sm text-violet-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/dashboard/assets/page.tsx
git commit -m "feat(ui): assets list page"
```

---

### Task 12: Assets UI — new asset form

**Files:**
- Create: `app/dashboard/assets/new/page.tsx`

**Step 1: Create the file**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['Hardware', 'Software'] as const;

export default function NewAssetPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', type: 'Hardware' as 'Hardware' | 'Software',
    make: '', model: '', serialNumber: '', location: '',
    purchaseDate: '', warrantyExpiry: '', cost: ''
  });

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          make: form.make || undefined,
          model: form.model || undefined,
          serialNumber: form.serialNumber || undefined,
          location: form.location || undefined,
          purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined,
          warrantyExpiry: form.warrantyExpiry ? new Date(form.warrantyExpiry).toISOString() : undefined,
          cost: form.cost || undefined
        })
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? 'Failed to register asset');
      }
      const { asset } = await res.json() as { asset: { id: number } };
      router.push(`/dashboard/assets/${asset.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Register Asset</h1>
        <p className="mt-1 text-sm text-gray-500">Add a hardware device or software license to inventory.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g. MacBook Pro 14-inch" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select value={form.type} onChange={e => set('type', e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
            <input value={form.make} onChange={e => set('make', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g. Apple" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input value={form.model} onChange={e => set('model', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g. MacBook Pro M3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{form.type === 'Software' ? 'License Key' : 'Serial Number'}</label>
            <input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder={form.type === 'Software' ? 'XXXX-XXXX-XXXX' : 'C02Z...'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g. Desk 3B, Remote" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
            <input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
            <input type="date" value={form.warrantyExpiry} onChange={e => set('warrantyExpiry', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
            <input type="number" step="0.01" min="0" value={form.cost} onChange={e => set('cost', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="0.00" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
            {submitting ? 'Registering…' : 'Register Asset'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/dashboard/assets/new/page.tsx
git commit -m "feat(ui): new asset registration form"
```

---

### Task 13: Assets UI — detail page

**Files:**
- Create: `app/dashboard/assets/[id]/page.tsx`

**Step 1: Create the file**

```tsx
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { assets, assetHistory, assetLinks, tickets, serviceRequests, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  'In Repair': 'bg-amber-100 text-amber-700',
  Retired: 'bg-gray-100 text-gray-500'
};

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) notFound();

  const [asset] = await db
    .select()
    .from(assets)
    .leftJoin(users, eq(assets.assignedUserId, users.id))
    .where(eq(assets.id, assetId))
    .limit(1);

  if (!asset) notFound();

  const isAgent = hasRole(session, 'Agent');
  const userId = parseInt(session.user.id, 10);
  if (!isAgent && asset.assets.assignedUserId !== userId) notFound();

  const a = asset.assets;
  const assignedUser = asset.users;

  const history = await db
    .select({
      id: assetHistory.id,
      assignedAt: assetHistory.assignedAt,
      returnedAt: assetHistory.returnedAt,
      notes: assetHistory.notes,
      assignedTo: { id: users.id, fullName: users.fullName }
    })
    .from(assetHistory)
    .leftJoin(users, eq(assetHistory.assignedToUserId, users.id))
    .where(eq(assetHistory.assetId, assetId))
    .orderBy(desc(assetHistory.assignedAt));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{a.name}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500 font-mono">{a.assetTag}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/assets" className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            ← Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Details</h2>
          {[
            ['Type', a.type],
            ['Make', a.make],
            ['Model', a.model],
            ['Serial / License', a.serialNumber],
            ['Location', a.location],
            ['Cost', a.cost ? `$${a.cost}` : null],
            ['Purchase Date', a.purchaseDate ? format(new Date(a.purchaseDate), 'MMM d, yyyy') : null],
            ['Warranty Expiry', a.warrantyExpiry ? format(new Date(a.warrantyExpiry), 'MMM d, yyyy') : null],
            ['Assigned To', assignedUser?.fullName]
          ].map(([label, value]) => value ? (
            <div key={label as string} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-900 font-medium">{value}</span>
            </div>
          ) : null)}
        </div>

        {/* Agent Actions */}
        {isAgent && a.status !== 'Retired' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Actions</h2>
            <p className="text-xs text-gray-500">Use the API or a future actions panel to reassign or retire this asset.</p>
          </div>
        )}
      </div>

      {/* Assignment History */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Assignment History</h2>
          <ul className="space-y-2">
            {history.map(h => (
              <li key={h.id} className="text-sm text-gray-700 flex gap-4">
                <span className="text-gray-400 shrink-0">{format(new Date(h.assignedAt), 'MMM d, yyyy')}</span>
                <span>Assigned to <strong>{h.assignedTo?.fullName ?? 'Unknown'}</strong>
                  {h.returnedAt && ` → returned ${format(new Date(h.returnedAt), 'MMM d, yyyy')}`}
                  {h.notes && <span className="text-gray-500"> — {h.notes}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/dashboard/assets/[id]/page.tsx
git commit -m "feat(ui): asset detail page with history"
```

---

### Task 14: Service Requests UI — list page

**Files:**
- Create: `app/dashboard/service-requests/page.tsx`

**Step 1: Create the file**

```tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { serviceRequests, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { InboxStackIcon, PlusIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-700',
  Approved: 'bg-violet-100 text-violet-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Fulfilled: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700'
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-orange-100 text-orange-700',
  P3: 'bg-blue-100 text-blue-700',
  P4: 'bg-gray-100 text-gray-600'
};

export default async function ServiceRequestsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = parseInt(session.user.id, 10);
  const isAgent = hasRole(session, 'Agent');

  const rows = await db
    .select({
      id: serviceRequests.id,
      requestNumber: serviceRequests.requestNumber,
      title: serviceRequests.title,
      category: serviceRequests.category,
      status: serviceRequests.status,
      priority: serviceRequests.priority,
      createdAt: serviceRequests.createdAt,
      requester: { id: users.id, fullName: users.fullName }
    })
    .from(serviceRequests)
    .leftJoin(users, eq(serviceRequests.requesterId, users.id))
    .where(!isAgent ? eq(serviceRequests.requesterId, userId) : undefined as any)
    .orderBy(desc(serviceRequests.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAgent ? 'All service requests' : 'Your service requests'}
          </p>
        </div>
        <Link
          href="/dashboard/service-requests/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700"
        >
          <PlusIcon className="h-4 w-4" />
          New Request
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <InboxStackIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No service requests yet.</p>
          <Link href="/dashboard/service-requests/new" className="mt-3 inline-block text-sm text-violet-600 hover:underline">Submit your first request</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Request #', 'Title', 'Category', 'Priority', 'Status', isAgent ? 'Requester' : null, 'Created'].filter(Boolean).map(h => (
                  <th key={h!} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(req => (
                <tr key={req.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/service-requests/${req.id}`} className="text-sm font-mono text-violet-700 hover:underline">
                      {req.requestNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">{req.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{req.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[req.priority]}`}>{req.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                  </td>
                  {isAgent && <td className="px-4 py-3 text-sm text-gray-600">{req.requester?.fullName ?? '—'}</td>}
                  <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(req.createdAt), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/dashboard/service-requests/page.tsx
git commit -m "feat(ui): service requests list page"
```

---

### Task 15: Service Requests UI — new request form

**Files:**
- Create: `app/dashboard/service-requests/new/page.tsx`

**Step 1: Create the file**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['New Equipment', 'Software Access', 'Account Setup', 'Hardware Repair', 'Other'] as const;
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;
const PRIORITY_LABELS: Record<string, string> = {
  P1: 'P1 — Critical',
  P2: 'P2 — High',
  P3: 'P3 — Medium',
  P4: 'P4 — Low'
};

export default function NewServiceRequestPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'New Equipment' as typeof CATEGORIES[number],
    priority: 'P3' as typeof PRIORITIES[number]
  });

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? 'Failed to submit request');
      }
      const { serviceRequest } = await res.json() as { serviceRequest: { id: number } };
      router.push(`/dashboard/service-requests/${serviceRequest.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Service Request</h1>
        <p className="mt-1 text-sm text-gray-500">Submit a request for equipment, software access, or account setup.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input required value={form.title} onChange={e => set('title', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Brief summary of your request" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea required rows={4} value={form.description} onChange={e => set('description', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            placeholder="Describe what you need and why..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/dashboard/service-requests/new/page.tsx
git commit -m "feat(ui): new service request form"
```

---

### Task 16: Service Requests UI — detail page

**Files:**
- Create: `app/dashboard/service-requests/[id]/page.tsx`

**Step 1: Create the file**

```tsx
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { serviceRequests, serviceRequestComments, users, assetLinks, assets } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { format } from 'date-fns';
import ServiceRequestActions from '@/components/service-requests/ServiceRequestActions';

const STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-700',
  Approved: 'bg-violet-100 text-violet-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Fulfilled: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700'
};

export default async function ServiceRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  const srId = parseInt(id, 10);
  if (isNaN(srId)) notFound();

  const [sr] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, srId)).limit(1);
  if (!sr) notFound();

  const userId = parseInt(session.user.id, 10);
  const isAgent = hasRole(session, 'Agent');
  if (!isAgent && sr.requesterId !== userId) notFound();

  const [requester] = await db.select({ fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, sr.requesterId)).limit(1);

  let assignedAgent = null;
  if (sr.assignedAgentId) {
    const [a] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, sr.assignedAgentId)).limit(1);
    assignedAgent = a ?? null;
  }

  const comments = await db
    .select({
      id: serviceRequestComments.id,
      body: serviceRequestComments.body,
      createdAt: serviceRequestComments.createdAt,
      author: { id: users.id, fullName: users.fullName, role: users.role }
    })
    .from(serviceRequestComments)
    .innerJoin(users, eq(serviceRequestComments.authorId, users.id))
    .where(eq(serviceRequestComments.serviceRequestId, srId))
    .orderBy(asc(serviceRequestComments.createdAt));

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{sr.title}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[sr.status]}`}>{sr.status}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{sr.priority}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500 font-mono">{sr.requestNumber}</p>
        </div>
        <Link href="/dashboard/service-requests" className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
          ← Back
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{sr.description}</p>
          </div>

          {sr.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800">Rejection Reason</p>
              <p className="mt-1 text-sm text-red-700">{sr.rejectionReason}</p>
            </div>
          )}

          {/* Comments */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
            {comments.length === 0 && <p className="text-sm text-gray-400 italic">No comments yet.</p>}
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-semibold shrink-0">
                  {c.author.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">{c.author.fullName}</span>
                    <span>{format(new Date(c.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  <p className="text-sm text-gray-700">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</h2>
            {[
              ['Category', sr.category],
              ['Requester', requester?.fullName],
              ['Assigned To', assignedAgent?.fullName ?? 'Unassigned'],
              ['Submitted', format(new Date(sr.createdAt), 'MMM d, yyyy')],
              sr.approvedAt ? ['Approved', format(new Date(sr.approvedAt), 'MMM d, yyyy')] : null,
              sr.fulfilledAt ? ['Fulfilled', format(new Date(sr.fulfilledAt), 'MMM d, yyyy')] : null,
            ].filter(Boolean).map(([label, value]) => (
              <div key={label as string} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Agent actions */}
          {isAgent && <ServiceRequestActions srId={srId} status={sr.status} />}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create the client actions component**

Create: `components/service-requests/ServiceRequestActions.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NEXT_STATUSES: Record<string, { label: string; status: string; danger?: boolean }[]> = {
  Submitted: [
    { label: 'Approve', status: 'Approved' },
    { label: 'Reject', status: 'Rejected', danger: true }
  ],
  Approved: [
    { label: 'Start Work', status: 'In Progress' },
    { label: 'Reject', status: 'Rejected', danger: true }
  ],
  'In Progress': [
    { label: 'Fulfill', status: 'Fulfilled' },
    { label: 'Reject', status: 'Rejected', danger: true }
  ]
};

export default function ServiceRequestActions({ srId, status }: { srId: number; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  const actions = NEXT_STATUSES[status] ?? [];
  if (actions.length === 0) return null;

  async function transition(toStatus: string) {
    if (toStatus === 'Rejected' && !showReject) {
      setShowReject(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/service-requests/${srId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus, rejectionReason: toStatus === 'Rejected' ? rejectionReason : undefined })
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? 'Failed to update status');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</h2>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {showReject && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Rejection reason *</label>
          <textarea rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => transition('Rejected')} disabled={!rejectionReason.trim() || loading}
              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50">
              Confirm Reject
            </button>
            <button onClick={() => setShowReject(false)} className="px-3 py-1.5 border border-gray-300 text-xs rounded text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}
      {!showReject && actions.map(action => (
        <button key={action.status} onClick={() => transition(action.status)} disabled={loading}
          className={`w-full px-3 py-2 rounded text-sm font-medium disabled:opacity-50 ${
            action.danger
              ? 'border border-red-300 text-red-700 hover:bg-red-50'
              : 'bg-violet-600 text-white hover:bg-violet-700'
          }`}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add app/dashboard/service-requests/[id]/page.tsx components/service-requests/ServiceRequestActions.tsx
git commit -m "feat(ui): service request detail page with actions panel"
```

---

### Task 17: User Profile UI

**Files:**
- Create: `app/dashboard/users/[id]/page.tsx`

**Step 1: Create the file**

```tsx
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { users, assets, tickets, serviceRequests } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  'In Repair': 'bg-amber-100 text-amber-700',
  Retired: 'bg-gray-100 text-gray-500',
  Submitted: 'bg-blue-100 text-blue-700',
  Approved: 'bg-violet-100 text-violet-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Fulfilled: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  New: 'bg-blue-100 text-blue-700',
  Assigned: 'bg-violet-100 text-violet-700',
  Pending: 'bg-amber-100 text-amber-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-500'
};

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  const targetId = parseInt(id, 10);
  if (isNaN(targetId)) notFound();

  const sessionUserId = parseInt(session.user.id, 10);
  const isAgent = hasRole(session, 'Agent');
  if (targetId !== sessionUserId && !isAgent) notFound();

  const [user] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role, location: users.location })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  if (!user) notFound();

  const [userAssets, openTickets, openRequests] = await Promise.all([
    db.select({ id: assets.id, assetTag: assets.assetTag, name: assets.name, type: assets.type, status: assets.status })
      .from(assets).where(eq(assets.assignedUserId, targetId)),
    db.select({ id: tickets.id, ticketNumber: tickets.ticketNumber, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt })
      .from(tickets).where(and(eq(tickets.createdBy, targetId), ne(tickets.status, 'Closed'))),
    db.select({ id: serviceRequests.id, requestNumber: serviceRequests.requestNumber, title: serviceRequests.title, status: serviceRequests.status, priority: serviceRequests.priority, createdAt: serviceRequests.createdAt })
      .from(serviceRequests).where(and(eq(serviceRequests.requesterId, targetId), ne(serviceRequests.status, 'Fulfilled')))
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
          <p className="mt-1 text-sm text-gray-500">{user.email} · <span className="font-medium">{user.role}</span>{user.location ? ` · ${user.location}` : ''}</p>
        </div>
      </div>

      {/* Assets */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Assets ({userAssets.length})</h2>
        {userAssets.length === 0 ? <p className="text-sm text-gray-400 italic">No assets assigned.</p> : (
          <ul className="divide-y divide-gray-100">
            {userAssets.map(a => (
              <li key={a.id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-violet-700">{a.assetTag}</span>
                  <span className="text-sm text-gray-900">{a.name}</span>
                  <span className="text-xs text-gray-500">{a.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                  <Link href={`/dashboard/assets/${a.id}`} className="text-xs text-violet-600 hover:underline">View</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Open Incidents */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Open Incidents ({openTickets.length})</h2>
        {openTickets.length === 0 ? <p className="text-sm text-gray-400 italic">No open incidents.</p> : (
          <ul className="divide-y divide-gray-100">
            {openTickets.map(t => (
              <li key={t.id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-violet-700">{t.ticketNumber}</span>
                  <span className="text-sm text-gray-900 truncate max-w-xs">{t.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                  <Link href={`/dashboard/issue-logging/${t.id}`} className="text-xs text-violet-600 hover:underline">View</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Open Service Requests */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Open Service Requests ({openRequests.length})</h2>
        {openRequests.length === 0 ? <p className="text-sm text-gray-400 italic">No open service requests.</p> : (
          <ul className="divide-y divide-gray-100">
            {openRequests.map(r => (
              <li key={r.id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-violet-700">{r.requestNumber}</span>
                  <span className="text-sm text-gray-900 truncate max-w-xs">{r.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  <Link href={`/dashboard/service-requests/${r.id}`} className="text-xs text-violet-600 hover:underline">View</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/dashboard/users/[id]/page.tsx
git commit -m "feat(ui): user profile page — assets, open incidents, open requests"
```

---

### Task 18: E2E tests

**Files:**
- Create: `e2e/assets/assets.spec.ts`
- Create: `e2e/service-requests/service-requests.spec.ts`

**Step 1: Check existing E2E setup**

Read `e2e/auth.setup.ts` and one existing spec to understand the `storageState` and login pattern before writing tests.

**Step 2: Create `e2e/assets/assets.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/agent.json' });

test('can register an asset and view it in the list', async ({ page }) => {
  await page.goto('/dashboard/assets/new');
  await page.getByLabel('Name *').fill('Test Laptop E2E');
  await page.getByLabel('Make').fill('Dell');
  await page.getByLabel('Model').fill('XPS 15');
  await page.getByRole('button', { name: 'Register Asset' }).click();

  // Should redirect to asset detail
  await expect(page).toHaveURL(/\/dashboard\/assets\/\d+/);
  await expect(page.getByText('Test Laptop E2E')).toBeVisible();
  await expect(page.getByText('Active')).toBeVisible();
});

test('asset list shows registered asset', async ({ page }) => {
  await page.goto('/dashboard/assets');
  await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();
  // At least the table or empty state renders
  await expect(page.locator('table, [class*="text-center"]')).toBeVisible();
});
```

**Step 3: Create `e2e/service-requests/service-requests.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/employee.json' });

test('employee can submit a service request', async ({ page }) => {
  await page.goto('/dashboard/service-requests/new');
  await page.getByLabel('Title *').fill('Need new keyboard E2E');
  await page.getByLabel('Description *').fill('My keyboard is broken and I need a replacement.');
  await page.getByRole('button', { name: 'Submit Request' }).click();

  await expect(page).toHaveURL(/\/dashboard\/service-requests\/\d+/);
  await expect(page.getByText('Need new keyboard E2E')).toBeVisible();
  await expect(page.getByText('Submitted')).toBeVisible();
});

test('service request list shows submitted request', async ({ page }) => {
  await page.goto('/dashboard/service-requests');
  await expect(page.getByRole('heading', { name: 'Service Requests' })).toBeVisible();
  await expect(page.locator('table, [class*="text-center"]')).toBeVisible();
});

test.describe('agent actions', () => {
  test.use({ storageState: 'e2e/.auth/agent.json' });

  test('agent can approve a submitted service request', async ({ page, request }) => {
    // Create a request as setup
    const res = await request.post('/api/service-requests', {
      data: { title: 'Agent approve test', description: 'Test desc', category: 'Other', priority: 'P3' }
    });
    expect(res.ok()).toBeTruthy();
    const { serviceRequest } = await res.json() as { serviceRequest: { id: number } };

    await page.goto(`/dashboard/service-requests/${serviceRequest.id}`);
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Approved')).toBeVisible({ timeout: 10000 });
  });
});
```

**Step 4: Run the new E2E tests**

```bash
npx playwright test e2e/assets/ e2e/service-requests/ --project=agent
```

Expected: all tests pass.

**Step 5: Run full suite to confirm no regressions**

```bash
npx playwright test
```

Expected: all tests pass.

**Step 6: Commit**

```bash
git add e2e/assets/ e2e/service-requests/
git commit -m "test(e2e): add assets and service requests E2E tests"
```

---

## Summary of Changes

| File | Type | Task |
|---|---|---|
| `lib/db/schema.ts` | Modified | 1 |
| `lib/db/migrations/` | Generated | 1 |
| `lib/validators.ts` | Modified | 2 |
| `app/api/assets/route.ts` | Created | 3 |
| `app/api/assets/[id]/route.ts` | Created | 4 |
| `app/api/assets/[id]/assign/route.ts` | Created | 4 |
| `app/api/assets/[id]/retire/route.ts` | Created | 4 |
| `app/api/service-requests/route.ts` | Created | 5 |
| `app/api/service-requests/[id]/route.ts` | Created | 6 |
| `app/api/service-requests/[id]/status/route.ts` | Created | 7 |
| `app/api/service-requests/[id]/assign/route.ts` | Created | 8 |
| `app/api/service-requests/[id]/comments/route.ts` | Created | 8 |
| `app/api/users/[id]/summary/route.ts` | Created | 9 |
| `components/layout/DashboardNav.tsx` | Modified | 10 |
| `app/dashboard/assets/page.tsx` | Created | 11 |
| `app/dashboard/assets/new/page.tsx` | Created | 12 |
| `app/dashboard/assets/[id]/page.tsx` | Created | 13 |
| `app/dashboard/service-requests/page.tsx` | Created | 14 |
| `app/dashboard/service-requests/new/page.tsx` | Created | 15 |
| `app/dashboard/service-requests/[id]/page.tsx` | Created | 16 |
| `components/service-requests/ServiceRequestActions.tsx` | Created | 16 |
| `app/dashboard/users/[id]/page.tsx` | Created | 17 |
| `e2e/assets/assets.spec.ts` | Created | 18 |
| `e2e/service-requests/service-requests.spec.ts` | Created | 18 |
