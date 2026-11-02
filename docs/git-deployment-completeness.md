# Prevent Git deployments from dropping the working API

The SEO-only commit 7937e85 did not include untracked vercel.json or api/index.js. Git-triggered Production therefore lacked both SPA routing and the API entry point. A CLI deployment restored the complete working copy.

Before the next Git-triggered deployment, review and commit the deployment implementation together:
- vercel.json, .vercelignore, .gitignore, api/index.js
- package.json and package-lock.json
- server/index.js and its related changed/new modules (including directUploads.js, directUploadServices.js, documentScanner.js and applicationSecurity.js)
- shared/application.js and shared/reviewUpload.js
- src/api changes, application form/status/upload integration, and review photo-limit changes
- required imported components, including the currently untracked Skeleton directory if committing its callers
- regression tests, helpers and the direct-upload SQL migration for reproducibility

Review other pending UI changes separately. Do not commit .env files, .vercel credentials, .phase1-local-test contents, applicant documents or incidental screenshots. Do not merely commit vercel.json: its API target imports backend modules that must also be present in Git.

Validate a clean checkout with npm ci, npm run build, npm run lint and npm test before relying on automatic deployments. Check /application, /application/status, /api/health and /sitemap.xml after deployment.
