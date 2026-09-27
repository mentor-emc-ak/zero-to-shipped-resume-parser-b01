# zero-to-shipped-resume-parser-b01

Upload a PDF resume, paste a job description, and get a 0-100 fit score from labd, with the skills your resume covers and misses and suggested edits.

## Run locally

Put your labd key and MongoDB Atlas credentials in `server/.env`:

```sh
LABD_AI_KEY=...
MONGODB_USERNAME=...
MONGODB_PASSWORD=...
JWT_SECRET=...        # openssl rand -hex 32
```

The npm scripts load it with `--env-file-if-exists`, which needs Node 22.9 or later.

```sh
cd server && npm install && npm run dev      # API on http://localhost:3000
cd frontend && npm install && npm run dev    # site on http://localhost:5173
```

Vite proxies `/api` to the server, so open http://localhost:5173.

## API

`POST /api/score` takes multipart form data with `resume` (PDF, max 4 MB) and `jobDescription` (text). It returns `score`, `summary`, `matchedSkills`, `missingSkills` and `suggestions`. A labd call takes about 30 seconds.

Every score is saved to the `scores` collection in the `resume_scorer` database, with the resume text and the job description.

### Accounts

`POST /api/auth/signup` and `POST /api/auth/login` take JSON `{ "email", "password" }` and return `{ token, user }`. Passwords need at least 8 characters. The token is an HS256 JWT signed with `JWT_SECRET` and valid for 7 days. `GET /api/auth/me` returns the user for `Authorization: Bearer <token>`.

Users live in the `users` collection with a unique index on `email`. Passwords are stored as scrypt hashes. The frontend keeps the token in `localStorage`. Scoring does not require an account.

On Vercel, set `LABD_AI_KEY`, `MONGODB_USERNAME`, `MONGODB_PASSWORD` and `JWT_SECRET` in the project's environment variables, and allow Vercel's IPs in Atlas network access. Secrets stay on the server.

## Tests

```sh
cd server && npm test
```
