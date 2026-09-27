# zero-to-shipped-resume-parser-b01

Upload a PDF resume, paste a job description, and get a 0-100 match score with the JD keywords your resume covers and misses.

## Run locally

```sh
cd server && npm install && npm run dev      # API on http://localhost:3000
cd frontend && npm install && npm run dev    # site on http://localhost:5173
```

Vite proxies `/api` to the server, so open http://localhost:5173.

## API

`POST /api/score` takes multipart form data with `resume` (PDF, max 4 MB) and `jobDescription` (text). It returns `score`, `keywordCount`, `matchedKeywords` and `missingKeywords`.

The score is keyword coverage. It takes the 30 most repeated distinctive terms in the JD, weights each by how often the JD uses it, and reports the weighted share found in the resume.

## Tests

```sh
cd server && npm test
```
