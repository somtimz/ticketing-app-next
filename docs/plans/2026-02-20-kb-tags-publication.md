# KB Tags & Publication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add explicit publication status badges, a `publishedAt` timestamp, and a many-to-many tagging system to KB articles.

**Architecture:** New `kb_tags` + `article_tags` schema tables; `publishedAt` column auto-set on first publish; tags returned as `[{id,name}]` array via JOIN in all KB read endpoints; tag input with autocomplete + create-on-the-fly in the create/edit forms; browse list gains Published badge, date, tag pills, and tag filter.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + PostgreSQL, Zod, React 19, Heroicons, Playwright E2E

---

### Task 1: Schema — add `publishedAt`, `kbTags`, `articleTags`

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: Add `publishedAt` to `knowledgeBaseArticles`**

In `lib/db/schema.ts`, inside `knowledgeBaseArticles`, add after `isAgentOnly`:

```ts
publishedAt: timestamp('published_at'),
```

(nullable — no `.notNull()`, no default)

**Step 2: Add `kbTags` table**

After the `knowledgeBaseArticles` table definition, add:

```ts
export const kbTags = pgTable('kb_tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`)
});
```

**Step 3: Add `articleTags` join table**

After `kbTags`:

```ts
export const articleTags = pgTable('article_tags', {
  articleId: integer('article_id')
    .notNull()
    .references(() => knowledgeBaseArticles.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id')
    .notNull()
    .references(() => kbTags.id, { onDelete: 'cascade' })
});
```

**Step 4: Add type exports** at the bottom of schema.ts:

```ts
export type KbTag = typeof kbTags.$inferSelect;
export type NewKbTag = typeof kbTags.$inferInsert;
export type ArticleTag = typeof articleTags.$inferSelect;
```

**Step 5: Generate and run migration**

```bash
cd /mnt/d/dev/claude-sandbox/ticketing-app-next && npm run db:generate
npm run db:migrate
```

Expected: migration applied, no errors.

**Step 6: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations && git commit -m "feat(schema): add publishedAt, kbTags, articleTags"
```

---

### Task 2: New API routes — `GET/POST /api/kb/tags`

**Files:**
- Create: `app/api/kb/tags/route.ts`

**Step 1: Write the route file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { kbTags } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requireAuth, requireRole, handleAPIError } from '@/lib/api-error';

// GET /api/kb/tags — list all tags (any authenticated user)
export async function GET() {
  try {
    const session = await auth();
    requireAuth(session);

    const tags = await db
      .select({ id: kbTags.id, name: kbTags.name })
      .from(kbTags)
      .orderBy(asc(kbTags.name));

    return NextResponse.json({ tags });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/kb/tags — create a new tag (Agent+)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { name } = await req.json() as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: 'bad_request', message: 'Tag name is required' }, { status: 400 });
    }

    const trimmed = name.trim().toLowerCase();

    // Return existing tag if name already taken
    const [existing] = await db
      .select({ id: kbTags.id, name: kbTags.name })
      .from(kbTags)
      .where(eq(kbTags.name, trimmed));

    if (existing) return NextResponse.json(existing, { status: 200 });

    const [tag] = await db
      .insert(kbTags)
      .values({ name: trimmed })
      .returning({ id: kbTags.id, name: kbTags.name });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 2: Verify build**

```bash
cd /mnt/d/dev/claude-sandbox/ticketing-app-next && npm run build 2>&1 | tail -10
```

Expected: clean build.

**Step 3: Commit**

```bash
git add app/api/kb/tags/route.ts && git commit -m "feat(api): add GET/POST /api/kb/tags"
```

---

### Task 3: Validators — add `tagIds` to KB schemas

**Files:**
- Modify: `lib/validators.ts`

**Step 1: Update `createKBArticleSchema`**

Add `tagIds` field (the last line before closing `}`):

```ts
tagIds: z.array(z.number().int()).optional()
```

The full schema becomes:
```ts
export const createKBArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  categoryId: z.number().int().optional(),
  isPublished: z.boolean().default(false),
  isAgentOnly: z.boolean().default(false),
  tagIds: z.array(z.number().int()).optional()
});
```

`updateKBArticleSchema` is `createKBArticleSchema.partial()` so gets it automatically.

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

**Step 3: Commit**

```bash
git add lib/validators.ts && git commit -m "feat(validators): add tagIds to KB article schemas"
```

---

### Task 4: Update `/api/kb/articles` — tags + publishedAt in list and create

**Files:**
- Modify: `app/api/kb/articles/route.ts`

Read the file first. Key changes:

**Step 1: Add imports**

Add to the existing drizzle-orm import: `inArray`
Add to schema import: `articleTags, kbTags`

```ts
import { eq, and, or, ilike, sql, desc, inArray } from 'drizzle-orm';
import { knowledgeBaseArticles, categories, articleTags, kbTags } from '@/lib/db/schema';
```

**Step 2: GET handler — return `tags` and `publishedAt`**

After fetching the `articles` array, add a second query to fetch tags for all returned article IDs:

```ts
// Fetch tags for all returned articles
const articleIds = articles.map(a => a.id);
const tagRows = articleIds.length > 0
  ? await db
      .select({
        articleId: articleTags.articleId,
        tagId: kbTags.id,
        tagName: kbTags.name
      })
      .from(articleTags)
      .innerJoin(kbTags, eq(articleTags.tagId, kbTags.id))
      .where(inArray(articleTags.articleId, articleIds))
  : [];

// Build a map: articleId → [{id, name}]
const tagsMap = new Map<number, { id: number; name: string }[]>();
for (const row of tagRows) {
  if (!tagsMap.has(row.articleId)) tagsMap.set(row.articleId, []);
  tagsMap.get(row.articleId)!.push({ id: row.tagId, name: row.tagName });
}
```

Add `publishedAt` to the `.select({...})` block:
```ts
publishedAt: knowledgeBaseArticles.publishedAt,
```

Change the final `return NextResponse.json({...})` to merge tags in:
```ts
return NextResponse.json({
  articles: articles.map(a => ({ ...a, tags: tagsMap.get(a.id) ?? [] })),
  pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
});
```

**Step 3: POST handler — accept `tagIds`, set `publishedAt`**

After the article insert `.returning()`, add tag insertion and publishedAt logic:

```ts
const [article] = await db
  .insert(knowledgeBaseArticles)
  .values({
    title: data.title,
    content: data.content,
    categoryId: data.categoryId ?? null,
    isPublished: data.isPublished,
    isAgentOnly: data.isAgentOnly ?? false,
    publishedAt: data.isPublished ? new Date() : null,
    createdBy: parseInt(session!.user!.id)
  })
  .returning();

// Insert tags
if (data.tagIds && data.tagIds.length > 0) {
  await db.insert(articleTags).values(
    data.tagIds.map(tagId => ({ articleId: article.id, tagId }))
  );
}

return NextResponse.json({ ...article, tags: data.tagIds ?? [] }, { status: 201 });
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | tail -10
```

**Step 5: Commit**

```bash
git add app/api/kb/articles/route.ts && git commit -m "feat(api): return tags+publishedAt in KB articles list; accept tagIds on create"
```

---

### Task 5: Update `/api/kb/articles/[id]` — tags + publishedAt in detail and patch

**Files:**
- Modify: `app/api/kb/articles/[id]/route.ts`

Read the file first. Key changes:

**Step 1: Add imports**

Add `articleTags, kbTags` to schema import; add `inArray` to drizzle-orm import.

**Step 2: Return `publishedAt` from `getArticle()`**

Add to the `.select({...})` block inside `getArticle()`:
```ts
publishedAt: knowledgeBaseArticles.publishedAt,
```

**Step 3: GET handler — fetch and attach tags**

After `const article = await getArticle(...)` and the 404/403 checks, fetch tags:

```ts
const tagRows = await db
  .select({ id: kbTags.id, name: kbTags.name })
  .from(articleTags)
  .innerJoin(kbTags, eq(articleTags.tagId, kbTags.id))
  .where(eq(articleTags.articleId, articleId));

return NextResponse.json({ ...article, tags: tagRows });
```

Replace the existing `return NextResponse.json(article)` with the above (keep the viewCount increment before it).

**Step 4: PATCH handler — diff tags, set `publishedAt` on first publish**

After parsing `data = updateKBArticleSchema.parse(body)`, check for publishedAt transition:

```ts
// Set publishedAt on first publish
let publishedAt: Date | null | undefined = undefined; // undefined = don't change
if (data.isPublished === true) {
  const [current] = await db
    .select({ publishedAt: knowledgeBaseArticles.publishedAt, isPublished: knowledgeBaseArticles.isPublished })
    .from(knowledgeBaseArticles)
    .where(eq(knowledgeBaseArticles.id, articleId));
  if (current && !current.publishedAt) {
    publishedAt = new Date();
  }
}
```

Include `publishedAt` in the update `.set({...})` only when defined:
```ts
const [updated] = await db
  .update(knowledgeBaseArticles)
  .set({
    ...data,
    categoryId: data.categoryId ?? null,
    ...(publishedAt !== undefined ? { publishedAt } : {}),
    updatedAt: new Date()
  })
  .where(eq(knowledgeBaseArticles.id, articleId))
  .returning();
```

After the update, diff and sync tags if `data.tagIds` is present:

```ts
if (data.tagIds !== undefined) {
  // Delete all existing tags for this article
  await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
  // Insert new tags
  if (data.tagIds.length > 0) {
    await db.insert(articleTags).values(
      data.tagIds.map(tagId => ({ articleId, tagId }))
    );
  }
}

// Fetch updated tags
const tagRows = await db
  .select({ id: kbTags.id, name: kbTags.name })
  .from(articleTags)
  .innerJoin(kbTags, eq(articleTags.tagId, kbTags.id))
  .where(eq(articleTags.articleId, articleId));

return NextResponse.json({ ...updated, tags: tagRows });
```

**Step 5: Verify build**

```bash
npm run build 2>&1 | tail -10
```

**Step 6: Commit**

```bash
git add app/api/kb/articles/[id]/route.ts && git commit -m "feat(api): return tags+publishedAt in KB article detail; sync tags on PATCH"
```

---

### Task 6: Update `/api/kb/search` — return tags and publishedAt

**Files:**
- Modify: `app/api/kb/search/route.ts`

Read the file first.

**Step 1: Add imports**

Add `articleTags, kbTags` to schema import; add `inArray` to drizzle-orm import.

**Step 2: Add `publishedAt` to `.select({...})`**

```ts
publishedAt: knowledgeBaseArticles.publishedAt,
```

**Step 3: Fetch and attach tags after the articles query**

After `scoredArticles.sort(...)`, before `return NextResponse.json(...)`:

```ts
// Fetch tags for all articles
const articleIds = scoredArticles.map(a => a.id);
const tagRows = articleIds.length > 0
  ? await db
      .select({
        articleId: articleTags.articleId,
        tagId: kbTags.id,
        tagName: kbTags.name
      })
      .from(articleTags)
      .innerJoin(kbTags, eq(articleTags.tagId, kbTags.id))
      .where(inArray(articleTags.articleId, articleIds))
  : [];

const tagsMap = new Map<number, { id: number; name: string }[]>();
for (const row of tagRows) {
  if (!tagsMap.has(row.articleId)) tagsMap.set(row.articleId, []);
  tagsMap.get(row.articleId)!.push({ id: row.tagId, name: row.tagName });
}
```

Update the final return to spread tags:
```ts
return NextResponse.json({
  articles: scoredArticles.map(({ score, ...article }) => ({
    ...article,
    tags: tagsMap.get(article.id) ?? []
  })),
  pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
});
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | tail -10
```

**Step 5: Commit**

```bash
git add app/api/kb/search/route.ts && git commit -m "feat(api): return tags and publishedAt in KB search results"
```

---

### Task 7: KB browse UI — Published badge, date, tags, tag filter

**Files:**
- Modify: `app/dashboard/kb/page.tsx`

Read the file first.

**Step 1: Update `KBArticle` interface**

Add:
```ts
publishedAt: string | null;
tags: { id: number; name: string }[];
```

**Step 2: Add `Tag` state + fetch for tag filter**

Add state:
```ts
const [tags, setTags] = useState<{ id: number; name: string }[]>([]);
const [tagFilter, setTagFilter] = useState('');
```

Add fetch in `useEffect` alongside the categories fetch:
```ts
const tagsRes = await fetch('/api/kb/tags');
const tagsData = await tagsRes.json() as { tags: { id: number; name: string }[] };
setTags(tagsData.tags ?? []);
```

**Step 3: Pass `tagFilter` to `fetchArticles` and include in URL params**

Update `fetchArticles` signature to accept `tagId: string` and add to params:
```ts
if (tagId) params.set('tagId', tagId);
```

> Note: The `/api/kb/articles` endpoint does not yet filter by tag — this filter will be a UI-only client-side filter for now (filter `articles` in render). Add the server-side tag filter to the API in a follow-up if needed. For simplicity, add `?tagId=` to the URL but filter client-side:

After `setArticles(data.articles ?? [])`, apply the tag filter:
```ts
setArticles(
  tagFilter
    ? (data.articles ?? []).filter(a => a.tags.some(t => String(t.id) === tagFilter))
    : (data.articles ?? [])
);
```

**Step 4: Add tag filter `<select>` next to the category filter**

```tsx
<select
  value={tagFilter}
  onChange={e => { setTagFilter(e.target.value); setPage(1); }}
  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
>
  <option value="">All Tags</option>
  {tags.map(tag => (
    <option key={tag.id} value={String(tag.id)}>{tag.name}</option>
  ))}
</select>
```

**Step 5: Published badge**

Replace the existing Draft-only badge block:
```tsx
{isAgent && !article.isPublished && (
  <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">Draft</span>
)}
```

With:
```tsx
{isAgent && (
  article.isPublished
    ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Published</span>
    : <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">Draft</span>
)}
```

**Step 6: Date — show publishedAt or updatedAt**

Change:
```tsx
<span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
```

To:
```tsx
<span>
  {article.isPublished && article.publishedAt
    ? `Published ${new Date(article.publishedAt).toLocaleDateString()}`
    : `Updated ${new Date(article.updatedAt).toLocaleDateString()}`}
</span>
```

**Step 7: Tags pills**

After the category/draft/lock badges row, add a tag pills row:
```tsx
{article.tags && article.tags.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {article.tags.map(tag => (
      <span key={tag.id} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
        {tag.name}
      </span>
    ))}
  </div>
)}
```

**Step 8: Verify build**

```bash
npm run build 2>&1 | tail -10
```

**Step 9: Commit**

```bash
git add app/dashboard/kb/page.tsx && git commit -m "feat(ui): Published badge, publishedAt date, tag pills and filter in KB browse"
```

---

### Task 8: KB article detail UI — tags and publishedAt

**Files:**
- Modify: `app/dashboard/kb/[id]/page.tsx`

Read the file first.

**Step 1: Update `KBArticle` interface**

Add:
```ts
publishedAt: string | null;
tags: { id: number; name: string }[];
```

**Step 2: Add tags pills in the header area**

In the badges row (after category and Draft badges), add:
```tsx
{article.tags && article.tags.length > 0 && article.tags.map(tag => (
  <span key={tag.id} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
    {tag.name}
  </span>
))}
```

**Step 3: Update the metadata line to show publishedAt**

Change:
```tsx
<span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
```

To:
```tsx
<span>
  {article.isPublished && article.publishedAt
    ? `Published ${new Date(article.publishedAt).toLocaleDateString()}`
    : `Updated ${new Date(article.updatedAt).toLocaleDateString()}`}
</span>
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | tail -10
```

**Step 5: Commit**

```bash
git add app/dashboard/kb/[id]/page.tsx && git commit -m "feat(ui): show tags and publishedAt on KB article detail"
```

---

### Task 9: KB create/edit forms — tag input with autocomplete

**Files:**
- Modify: `app/dashboard/kb/new/page.tsx`
- Modify: `app/dashboard/kb/[id]/edit/page.tsx`

#### 9a: New article form

Read the file first.

**Step 1: Add tag state variables**

```ts
const [allTags, setAllTags] = useState<{ id: number; name: string }[]>([]);
const [selectedTags, setSelectedTags] = useState<{ id: number; name: string }[]>([]);
const [tagInput, setTagInput] = useState('');
```

**Step 2: Fetch all tags on mount**

In the categories `useEffect`, also fetch tags:
```ts
const tagsRes = await fetch('/api/kb/tags');
const tagsData = await tagsRes.json() as { tags: { id: number; name: string }[] };
setAllTags(tagsData.tags ?? []);
```

**Step 3: Tag handler functions**

```ts
const addTag = async (name: string) => {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed || selectedTags.some(t => t.name === trimmed)) return;
  const existing = allTags.find(t => t.name === trimmed);
  if (existing) {
    setSelectedTags(prev => [...prev, existing]);
  } else {
    // Create on the fly
    const res = await fetch('/api/kb/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed })
    });
    if (res.ok) {
      const tag = await res.json() as { id: number; name: string };
      setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTags(prev => [...prev, tag]);
    }
  }
  setTagInput('');
};

const removeTag = (id: number) => {
  setSelectedTags(prev => prev.filter(t => t.id !== id));
};
```

**Step 4: Include `tagIds` in POST body**

In `handleSubmit`:
```ts
tagIds: selectedTags.map(t => t.id)
```

**Step 5: Add tag UI below the `isAgentOnly` checkbox**

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
  {/* Selected tag pills */}
  {selectedTags.length > 0 && (
    <div className="flex flex-wrap gap-1 mb-2">
      {selectedTags.map(tag => (
        <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
          {tag.name}
          <button
            type="button"
            onClick={() => removeTag(tag.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )}
  {/* Tag input + suggestions */}
  <div className="flex gap-2">
    <div className="flex-1 relative">
      <input
        type="text"
        value={tagInput}
        onChange={e => setTagInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addTag(tagInput); } }}
        placeholder="Add a tag..."
        list="tag-suggestions"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <datalist id="tag-suggestions">
        {allTags
          .filter(t => !selectedTags.some(s => s.id === t.id))
          .filter(t => t.name.includes(tagInput.toLowerCase()))
          .map(tag => (
            <option key={tag.id} value={tag.name} />
          ))}
      </datalist>
    </div>
    <button
      type="button"
      onClick={() => void addTag(tagInput)}
      className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
    >
      Add
    </button>
  </div>
  <p className="mt-1 text-xs text-gray-400">Press Enter or click Add. New tag names are created automatically.</p>
</div>
```

#### 9b: Edit article form

Read the file first. Apply the same changes as 9a, but also:

**Step 1: Fetch existing article tags on load**

The article fetch already happens in `useEffect`. Extend the `KBArticle` interface:
```ts
tags?: { id: number; name: string }[];
```

After `setIsAgentOnly(article.isAgentOnly)`:
```ts
setSelectedTags(article.tags ?? []);
```

**Step 2: Include `tagIds` in PATCH body**

```ts
tagIds: selectedTags.map(t => t.id)
```

**Step 3: Add the same tag UI section as 9a**

**Step 4: Verify build**

```bash
npm run build 2>&1 | tail -10
```

**Step 5: Commit**

```bash
git add app/dashboard/kb/new/page.tsx app/dashboard/kb/[id]/edit/page.tsx && git commit -m "feat(ui): tag input with autocomplete and create-on-the-fly in KB forms"
```

---

### Task 10: E2E tests

**Files:**
- Modify: `e2e/kb/manage.spec.ts`

Read the file first.

**Add a test: create article with tags, verify on browse and detail**

```ts
test('article with tags shows tag pills on browse and detail', async ({ page, request }) => {
  // First create a tag via API
  const tagRes = await request.post('/api/kb/tags', { data: { name: 'e2e-test-tag' } });
  expect(tagRes.ok()).toBeTruthy();
  const { id: tagId } = await tagRes.json() as { id: number };

  // Create an article with that tag
  const createRes = await request.post('/api/kb/articles', {
    data: {
      title: 'E2E Tagged Article',
      content: 'Article with a tag.',
      isPublished: true,
      tagIds: [tagId]
    }
  });
  expect(createRes.ok()).toBeTruthy();
  const { id: articleId } = await createRes.json() as { id: number };

  try {
    // Browse list shows the tag pill
    await page.goto('/dashboard/kb');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('E2E Tagged Article')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('e2e-test-tag').first()).toBeVisible({ timeout: 5000 });

    // Browse list shows Published badge
    await expect(page.getByText('Published').first()).toBeVisible({ timeout: 5000 });

    // Article detail shows tag
    await page.goto(`/dashboard/kb/${articleId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('e2e-test-tag')).toBeVisible({ timeout: 10000 });
  } finally {
    await request.delete(`/api/kb/articles/${articleId}`);
  }
});
```

**Step 1: Run new test**

```bash
cd /mnt/d/dev/claude-sandbox/ticketing-app-next && npx playwright test e2e/kb/manage.spec.ts --project=agent 2>&1 | tail -15
```

Expected: all tests pass.

**Step 2: Run full suite**

```bash
npx playwright test 2>&1 | tail -8
```

Expected: 29+ tests pass.

**Step 3: Commit**

```bash
git add e2e/kb/manage.spec.ts && git commit -m "test(e2e): verify tag pills and Published badge on KB articles"
```

---

## Summary of changes

| File | Change |
|---|---|
| `lib/db/schema.ts` | Add `publishedAt`, `kbTags`, `articleTags` |
| `lib/db/migrations/` | New migration |
| `lib/validators.ts` | Add `tagIds` to KB schemas |
| `app/api/kb/tags/route.ts` | New — GET/POST tags |
| `app/api/kb/articles/route.ts` | Return tags+publishedAt; accept tagIds; set publishedAt on create |
| `app/api/kb/articles/[id]/route.ts` | Return tags+publishedAt; sync tags on PATCH; set publishedAt on first publish |
| `app/api/kb/search/route.ts` | Return tags+publishedAt |
| `app/dashboard/kb/page.tsx` | Published badge, publishedAt date, tag pills, tag filter |
| `app/dashboard/kb/[id]/page.tsx` | Tags pills, publishedAt in metadata |
| `app/dashboard/kb/new/page.tsx` | Tag input UI |
| `app/dashboard/kb/[id]/edit/page.tsx` | Tag input UI, load existing tags |
| `e2e/kb/manage.spec.ts` | New E2E test |
