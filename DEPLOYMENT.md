# Deployment Notes

This project is deployed as a static GitHub Pages site.

Live site:

```text
https://zenhanyin.github.io/ProjectA/
```

Repository:

```text
https://github.com/zenhanyin/ProjectA
```

## Responsibility

Future deployment work should be handled by Codex. The user should not need to perform manual deployment steps.

When changes are ready:

1. Commit the local changes.
2. Push to `origin/main`.
3. Confirm the GitHub Actions Pages workflow succeeds.
4. Verify the live site returns `200 OK`.

## Normal Path

Use Git first:

```powershell
git status --short --branch
git push
```

Pushing to `main` triggers:

```text
.github/workflows/pages.yml
```

## Known Issue

During the first deployment, regular Git HTTPS push intermittently failed with:

```text
Failed to connect to github.com port 443
Recv failure: Connection was reset
```

Plain HTTPS access to GitHub still worked, so the failure was specific to the Git smart HTTP push path.

## Fallback Path

If `git push` fails but GitHub HTTPS/API access works:

1. Use the existing GitHub credential from `git credential fill`.
2. Create blobs, tree, commit, and update `refs/heads/main` through the GitHub REST API.
3. If GitHub Pages is not enabled, create Pages with:

```json
{ "build_type": "workflow" }
```

4. Re-run the Pages workflow with `workflow_dispatch`.
5. Verify:

```text
https://zenhanyin.github.io/ProjectA/
```

Do not print or persist the GitHub token when using the API fallback.

## Cache Busting

Before deploying a breaking HTML/CSS/JS change, update all static asset query versions in `index.html`:

```html
css/style.css?v=YYYYMMDD-label
js/storage.js?v=YYYYMMDD-label
js/calculations.js?v=YYYYMMDD-label
js/ui.js?v=YYYYMMDD-label
js/app.js?v=YYYYMMDD-label
```

This prevents GitHub Pages visitors from loading new HTML with stale cached JavaScript.
