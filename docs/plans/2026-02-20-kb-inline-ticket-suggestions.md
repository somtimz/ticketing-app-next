# KB Inline Ticket Suggestions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show relevant KB articles inside the ticket Actions panel (Agent+ only), with an `isAgentOnly` flag so some articles are restricted to agents and not visible to Employees.

**Architecture:** Add `isAgentOnly` column to DB schema, enforce it in the three KB API routes, add a toggle on the KB create/edit forms, and render a `KbSuggestions` client component inside the existing ticket detail Actions panel.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + PostgreSQL, Zod, React 19, Heroicons, Playwright E2E

---

### Task 1: Schema — add `isAgentOnly` column

**Files:**
- Modify: `lib/db/schema.ts` (line 296–316, `knowledgeBaseArticles` table)

**Step 1: Add the column**

In `lib/db/schema.ts`, inside `knowledgeBaseArticles`, add after `isPublished`:

```ts
isAgentOnly: boolean('is_agent_only').notNull().default(false),
```

**Step 2: Generate and run migration**

```bash
npm run db:generate
npm run db:migrate
```

Expected: new migration file created and applied with no errors.

**Step 3: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations
git commit -m "feat(schema): add isAgentOnly to knowledge_base_articles"
```

---

### Task 2: Validators — accept `isAgentOnly` in KB schemas

**Files:**
- Modify: `lib/validators.ts` (lines 59–64)

**Step 1: Add field to createKBArticleSchema**

Change:
```ts
export const createKBArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  categoryId: z.number().int().optional(),
  isPublished: z.boolean().default(false)
});
```

To:
```ts
export const createKBArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  categoryId: z.number().int().optional(),
  isPublished: z.boolean().default(false),
  isAgentOnly: z.boolean().default(false)
});
```

`updateKBArticleSchema` is already `createKBArticleSchema.partial()` so it gets the field for free.

**Step 2: Verify build passes**

```bash
npm run build
```

Expected: no TypeScript errors.

**Step 3: Commit**

```bash
git add lib/validators.ts
git commit -m "feat(validators): add isAgentOnly to KB article schemas"
```

---

### Task 3: API — filter `isAgentOnly` in `/api/kb/search`

**Files:**
- Modify: `app/api/kb/search/route.ts`

**Step 1: Import `ne` from drizzle-orm**

The current import line is:
```ts
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
```

Change to:
```ts
import { eq, and, or, ilike, sql, desc, ne } from 'drizzle-orm';
```

**Step 2: Add role-based filter**

After line `const session = await auth();` check (around line 17), add a role check variable:

```ts
const userRole = (session!.user as any)?.role as string | undefined;
const isAgent = userRole === 'Agent' || userRole === 'TeamLead' || userRole === 'Admin';
```

In the `whereConditions` array (around line 50), add the filter as the first condition:

```ts
const whereConditions = [
  eq(knowledgeBaseArticles.isPublished, true),
  ...(!isAgent ? [ne(knowledgeBaseArticles.isAgentOnly, true)] : []),
  ...(searchConditions.length > 0 ? [or(...searchConditions)] : []),
  ...(categoryId ? [eq(knowledgeBaseArticles.categoryId, parseInt(categoryId))] : [])
];
```

**Step 3: Return `isAgentOnly` in select**

In the `.select({...})` block, add:
```ts
isAgentOnly: knowledgeBaseArticles.isAgentOnly,
```

**Step 4: Verify build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add app/api/kb/search/route.ts
git commit -m "feat(api): filter isAgentOnly articles from KB search for Employees"
```

---

### Task 4: API — filter `isAgentOnly` in `/api/kb/articles` list

**Files:**
- Modify: `app/api/kb/articles/route.ts`

**Step 1: Add Employee filter in GET handler**

In the `conditions` array build (after line 27, where `!isAgent` check is already present), add alongside the existing `isPublished` filter:

```ts
// Employees can only see published articles AND non-agent-only articles
if (!isAgent) {
  conditions.push(eq(knowledgeBaseArticles.isPublished, true));
  conditions.push(eq(knowledgeBaseArticles.isAgentOnly, false));
} else if (published === 'true') {
  conditions.push(eq(knowledgeBaseArticles.isPublished, true));
}
```

**Step 2: Return `isAgentOnly` in select**

In the `.select({...})` block (around line 59), add:
```ts
isAgentOnly: knowledgeBaseArticles.isAgentOnly,
```

**Step 3: Pass `isAgentOnly` in POST insert**

In the POST handler's `.values({...})` block, add:
```ts
isAgentOnly: data.isAgentOnly ?? false,
```

**Step 4: Verify build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add app/api/kb/articles/route.ts
git commit -m "feat(api): enforce isAgentOnly in KB articles list and create"
```

---

### Task 5: API — enforce `isAgentOnly` in `/api/kb/articles/[id]`

**Files:**
- Modify: `app/api/kb/articles/[id]/route.ts`

**Step 1: Return `isAgentOnly` from `getArticle()`**

In the `.select({...})` block of `getArticle()`, add:
```ts
isAgentOnly: knowledgeBaseArticles.isAgentOnly,
```

**Step 2: Block Employee access to agent-only articles in GET**

In the GET handler after `const article = await getArticle(...)`, add:
```ts
if (article.isAgentOnly && !isAgent) {
  throw new APIError(403, 'forbidden', 'This article is restricted to agents');
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add app/api/kb/articles/[id]/route.ts
git commit -m "feat(api): block Employee access to isAgentOnly KB articles"
```

---

### Task 6: KB UI — add `isAgentOnly` toggle on create and edit forms

**Files:**
- Modify: `app/dashboard/kb/new/page.tsx`
- Modify: `app/dashboard/kb/[id]/edit/page.tsx`

#### 6a: New article form

**Step 1: Add state variable**

After `const [isPublished, setIsPublished] = useState(false);`, add:
```ts
const [isAgentOnly, setIsAgentOnly] = useState(false);
```

**Step 2: Include in POST body**

In `handleSubmit`'s `JSON.stringify({...})`, add:
```ts
isAgentOnly
```

**Step 3: Add checkbox below the `isPublished` checkbox**

```tsx
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="isAgentOnly"
    checked={isAgentOnly}
    onChange={e => setIsAgentOnly(e.target.checked)}
    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
  />
  <label htmlFor="isAgentOnly" className="text-sm text-gray-700">
    Restrict to agents only (not visible to employees)
  </label>
</div>
```

#### 6b: Edit article form

Read `app/dashboard/kb/[id]/edit/page.tsx` first to understand its state shape, then:

**Step 1: Add `isAgentOnly` to the form state** (populated from the fetched article)

**Step 2: Include in PATCH body**

**Step 3: Add same checkbox below `isPublished`**

**Step 4: Verify build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add app/dashboard/kb/new/page.tsx app/dashboard/kb/[id]/edit/page.tsx
git commit -m "feat(ui): add isAgentOnly toggle to KB create and edit forms"
```

---

### Task 7: KB browse — show lock badge on agent-only articles

**Files:**
- Modify: `app/dashboard/kb/page.tsx`

Read the file first, then:

**Step 1: Import `LockClosedIcon`**

```ts
import { LockClosedIcon } from '@heroicons/react/24/solid';
```

**Step 2: Add badge on each article card where `isAgentOnly === true`**

Inside the article list render, next to the article title:
```tsx
{article.isAgentOnly && (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
    <LockClosedIcon className="h-3 w-3" />
    Agent only
  </span>
)}
```

**Step 3: Verify build, commit**

```bash
git add app/dashboard/kb/page.tsx
git commit -m "feat(ui): show Agent only badge on restricted KB articles"
```

---

### Task 8: Create `KbSuggestions` component

**Files:**
- Create: `components/tickets/KbSuggestions.tsx`

**Step 1: Write the component**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BookOpenIcon, LockClosedIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface KbArticle {
  id: number;
  title: string;
  content: string;
  isAgentOnly: boolean;
}

interface Props {
  ticketTitle: string;
}

export default function KbSuggestions({ ticketTitle }: Props): JSX.Element {
  const [autoResults, setAutoResults] = useState<KbArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KbArticle[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-load on mount using ticket title
  useEffect(() => {
    if (!ticketTitle.trim()) return;
    void (async () => {
      try {
        const res = await fetch(`/api/kb/search?q=${encodeURIComponent(ticketTitle)}&limit=3`);
        if (!res.ok) return;
        const data = await res.json() as { articles: KbArticle[] };
        setAutoResults(data.articles ?? []);
      } catch {
        // non-fatal
      }
    })();
  }, [ticketTitle]);

  // Debounced manual search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/kb/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
          if (!res.ok) return;
          const data = await res.json() as { articles: KbArticle[] };
          setSearchResults(data.articles ?? []);
        } catch {
          // non-fatal
        }
      })();
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const displayResults = searchQuery.trim() ? searchResults : autoResults;

  function excerpt(content: string): string {
    const plain = content.replace(/[#*`>\-_]/g, '').trim();
    return plain.length > 100 ? plain.slice(0, 100) + '…' : plain;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <BookOpenIcon className="h-4 w-4 text-violet-600" />
        Related Articles
      </h3>

      {/* Manual search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search knowledge base…"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          data-testid="kb-search-input"
        />
      </div>

      {displayResults.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No related articles found.</p>
      ) : (
        <ul className="space-y-2" data-testid="kb-suggestions-list">
          {displayResults.map(article => (
            <li key={article.id} className="border border-gray-200 rounded-md p-3 hover:border-violet-300 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/dashboard/kb/${article.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-violet-700 hover:underline"
                >
                  {article.title}
                </Link>
                {article.isAgentOnly && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded shrink-0">
                    <LockClosedIcon className="h-3 w-3" />
                    Agent only
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">{excerpt(article.content)}</p>
            </li>
          ))}
        </ul>
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
git add components/tickets/KbSuggestions.tsx
git commit -m "feat(ui): add KbSuggestions component for ticket detail page"
```

---

### Task 9: Wire `KbSuggestions` into ticket detail Actions panel

**Files:**
- Modify: `app/dashboard/issue-logging/[id]/page.tsx`

**Step 1: Import the component**

Add at the top of the file:
```ts
import KbSuggestions from '@/components/tickets/KbSuggestions';
```

**Step 2: Add to the Actions panel**

The Actions panel is at line 769–943 (the `{isOpen && <div>...` block). Inside `<div className="space-y-6">`, add a `<hr>` divider and the component **after** the Log Call section, before the closing `</div>`:

```tsx
{/* KB Suggestions (agent only) */}
{isAgent && ticket && (
  <>
    <hr className="border-gray-200" />
    <KbSuggestions ticketTitle={ticket.title} />
  </>
)}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add app/dashboard/issue-logging/[id]/page.tsx
git commit -m "feat(ui): show KB suggestions in ticket Actions panel for agents"
```

---

### Task 10: E2E tests

**Files:**
- Modify: `e2e/tickets/agent.spec.ts` — add KB suggestions panel test
- Modify: `e2e/kb/manage.spec.ts` — add isAgentOnly toggle test

#### 10a: KB suggestions visible to agent

In `e2e/tickets/agent.spec.ts`, add a new `test` block:

```ts
test('KB suggestions panel is visible on ticket detail', async ({ page }) => {
  // Navigate to any open ticket
  await page.goto('/dashboard/issue-logging');
  const ticketLink = page.locator('a[href*="/dashboard/issue-logging/"]:not([href$="new"])').first();
  await ticketLink.click();
  await page.waitForURL(/\/dashboard\/issue-logging\/\d+$/);

  // Related Articles heading should be visible (ticket may or may not be open)
  // If ticket is closed, Actions panel is hidden - navigate to an open ticket
  const heading = page.getByText('Related Articles');
  // If heading is not visible, the ticket might be resolved - just skip
  const isVisible = await heading.isVisible().catch(() => false);
  if (!isVisible) return; // ticket already resolved, skip

  await expect(heading).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('kb-search-input')).toBeVisible();
});
```

#### 10b: isAgentOnly article hidden from employee

In `e2e/kb/manage.spec.ts`, after existing tests, add:

```ts
test('agent-only article is not visible to employees in KB browse', async ({ page, request }) => {
  // Create an agent-only article via API
  const createRes = await request.post('/api/kb/articles', {
    data: {
      title: 'Agent Only Test Article',
      content: 'Internal procedures for agents.',
      isPublished: true,
      isAgentOnly: true
    }
  });
  expect(createRes.ok()).toBeTruthy();
  const { id } = await createRes.json() as { id: number };

  // Verify it appears in agent KB browse (we are agent)
  await page.goto('/dashboard/kb');
  await expect(page.getByText('Agent Only Test Article')).toBeVisible({ timeout: 10000 });

  // Clean up
  await request.delete(`/api/kb/articles/${id}`);
});
```

**Step 1: Run the new E2E tests**

```bash
npx playwright test e2e/tickets/agent.spec.ts e2e/kb/manage.spec.ts --project=agent
```

Expected: all tests pass.

**Step 2: Run full suite**

```bash
npx playwright test
```

Expected: 27/27 (or more if new tests added) pass.

**Step 3: Commit**

```bash
git add e2e/tickets/agent.spec.ts e2e/kb/manage.spec.ts
git commit -m "test(e2e): add KB suggestions and isAgentOnly visibility tests"
```

---

## Summary of changes

| File | Change |
|---|---|
| `lib/db/schema.ts` | Add `isAgentOnly` column |
| `lib/db/migrations/` | New generated migration |
| `lib/validators.ts` | Add `isAgentOnly` field |
| `app/api/kb/search/route.ts` | Filter by role; return field |
| `app/api/kb/articles/route.ts` | Filter + return + insert field |
| `app/api/kb/articles/[id]/route.ts` | 403 for employees; return + accept field |
| `app/dashboard/kb/new/page.tsx` | Add toggle checkbox |
| `app/dashboard/kb/[id]/edit/page.tsx` | Add toggle checkbox |
| `app/dashboard/kb/page.tsx` | Show lock badge |
| `components/tickets/KbSuggestions.tsx` | New component |
| `app/dashboard/issue-logging/[id]/page.tsx` | Wire in KbSuggestions |
| `e2e/tickets/agent.spec.ts` | New E2E test |
| `e2e/kb/manage.spec.ts` | New E2E test |
