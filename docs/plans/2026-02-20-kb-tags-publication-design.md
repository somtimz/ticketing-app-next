# KB Tags & Publication Design

**Date:** 2026-02-20

## Goal

Enhance KB articles with explicit publication status indicators, a publication date, and a many-to-many tagging system — while keeping the existing single `categoryId` for ticket-routing context.

## Schema Changes

### 1. Add `publishedAt` to `knowledgeBaseArticles`

```ts
publishedAt: timestamp('published_at'), // nullable; set when isPublished first becomes true
```

- Set automatically in the PATCH handler when `isPublished` transitions `false → true`
- Never reset if an article is unpublished again — records first publication date
- Also set on POST creation if `isPublished: true`

### 2. New `kbTags` table

```ts
kbTags = pgTable('kb_tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').notNull().default(now())
})
```

Lightweight, KB-only. Independent of the existing ticket categories.

### 3. New `articleTags` join table

```ts
articleTags = pgTable('article_tags', {
  articleId: integer('article_id').notNull().references(() => knowledgeBaseArticles.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => kbTags.id, { onDelete: 'cascade' })
})
// composite PK on (articleId, tagId)
```

`categoryId` remains on the article (single category, ticket-routing context). Tags are additive.

---

## API Changes

### Updated endpoints

| Endpoint | Change |
|---|---|
| `GET /api/kb/articles` | Join articleTags+kbTags → return `tags: [{id,name}]`; return `publishedAt` |
| `GET /api/kb/search` | Same — include `tags` and `publishedAt` |
| `GET /api/kb/articles/[id]` | Include `tags` and `publishedAt` |
| `POST /api/kb/articles` | Accept `tagIds: number[]`; insert articleTags rows; set `publishedAt` if publishing on create |
| `PATCH /api/kb/articles/[id]` | Accept `tagIds: number[]`; diff tags (delete removed, insert added); set `publishedAt` on first publish |

### New endpoints

| Endpoint | Description |
|---|---|
| `GET /api/kb/tags` | Returns all tags `[{id, name}]` — populates tag selector in forms |
| `POST /api/kb/tags` (Agent+) | Creates a new tag on-the-fly `{name}` → `{id, name}` |

---

## UI Changes

### KB browse list (`/dashboard/kb`)

- **Published badge**: green "Published" badge for `isPublished=true` articles (agents see this or "Draft", not both)
- **Date**: show `publishedAt` formatted ("Published Jan 15") for published articles; show `updatedAt` for drafts
- **Tags**: small gray pill badges below the title/category row
- **Tag filter**: dropdown next to search box — selecting a tag filters the article list

### KB article detail (`/dashboard/kb/[id]`)

- **Publication date**: shown in the metadata line ("Published Jan 15 · 42 views · 12 found helpful")
- **Tags**: small gray pill badges in the header area (below category badge)

### KB create/edit forms (`/dashboard/kb/new`, `/dashboard/kb/[id]/edit`)

- **Tag input** (Agent+): text input with autocomplete against existing tags
- **Create on the fly**: inline "Add" button creates new tag via `POST /api/kb/tags` if typed name doesn't exist
- **Selected tags**: shown as dismissible pills below the input
