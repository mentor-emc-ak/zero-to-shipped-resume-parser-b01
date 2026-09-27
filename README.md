# zero-to-shipped-resume-parser-b01

Upload a PDF resume, paste a job description, and get a 0-100 fit score from labd, with the skills your resume covers and misses and suggested edits.

## Run locally

Put your labd key in `server/.env`:

```sh
LABD_AI_KEY=...
```


```sh
cd server && npm install && npm run dev      # API on http://localhost:3000
cd frontend && npm install && npm run dev    # site on http://localhost:5173
```

Vite proxies `/api` to the server, so open http://localhost:5173.

## API

`POST /api/score` takes multipart form data with `resume` (PDF, max 4 MB) and `jobDescription` (text). It returns `score`, `summary`, `matchedSkills`, `missingSkills` and `suggestions`. A labd call takes about 30 seconds.

On Vercel, set `LABD_AI_KEY` in the project's environment variables. The key stays on the server.

## Tests

```sh
cd server && npm test
```
