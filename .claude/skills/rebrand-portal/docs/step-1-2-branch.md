# Step 1 — Confirm it's a demo (`demo-confirmed`)

Before anything mechanical, tell the customer in one plain sentence what
will happen: you'll make a copy of the site under their company's name,
give it their look and content, and share it as a portal link — the
original is never changed (I1, no internal terms). Mark `demo-confirmed`
`done`.

---

# Step 2 — Company and branch (`branch-resolved`)

**Resolve the company name → `customer.name`**, and its slug →
`customer.companyKey` (e.g. Disney → `disney`). If the entry answer named
a brand, use it; otherwise ask now. Apply I6 here: if the slug is empty or
reserved, pick a non-colliding company slug such as `<brand>-demo` before
creating any branch, DA folder, or AEM asset folder.

Resolve `{org}/{repo}` from `git remote get-url origin` — this shared
showcase repo itself, not a fork. The demo branch is `demo/<companyKey>`.

**Always check for an existing brand branch first, and ASK if one is
found — never silently reuse or recreate it.** Check local and remote:

```
git branch --list "demo/<companyKey>"
git ls-remote --heads origin "demo/<companyKey>"
```

- **None exists** → create and check out `demo/<companyKey>`.
- **One exists** → **stop and ask the customer** (do not choose for them;
  never delete it — I5):
  - **Continue on the existing one** — check it out and keep building on
    it (its open PR keeps updating).
  - **Start a fresh one** — create a new, non-colliding branch
    (`demo/<companyKey>-2`, `-3`, …), leaving the existing branch and its
    PR intact.
  Ask in plain outcome language (I1), e.g. "I already have a version of
  Disney's copy in progress — keep building on that one, or start a
  brand-new one and leave the existing as-is?" Honor the answer.

Record the chosen branch in `customer.demoBranch`. All rebrand **code**
edits happen on this branch. Mark `branch-resolved` `done`.
