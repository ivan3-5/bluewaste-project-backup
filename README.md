# BlueWaste System

BlueWaste is a smart waste management platform for Panabo City with:

- Backend API (Express + Prisma + PostgreSQL)
- Web app (Next.js)
- Mobile app (Expo/React Native)
- Optional YOLO inference API (FastAPI)

## Project Structure

- `backend` - Express API, Prisma schema, seed data
- `web` - Next.js web dashboard and citizen reporting UI
- `mobile` - Expo mobile app
- `yolo-fastapi-sample` - optional local YOLO inference service

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+
- Cloudinary account (for image upload in backend)
- Optional: Python 3.10+ (for local YOLO FastAPI service)

## 1) Install Dependencies

From the repository root:

```bash
npm install
```

## 2) Configure Environment Variables

Create environment files from the examples:

### PowerShell (Windows)

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item web/.env.example web/.env.local
Copy-Item mobile/.env.example mobile/.env
```

### Bash (macOS/Linux)

```bash
cp backend/.env.example backend/.env
cp web/.env.example web/.env.local
cp mobile/.env.example mobile/.env
```

Then update the values in each file.

### Backend env (`backend/.env`)

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bluewaste?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
PORT="5000"
NODE_ENV="development"
WEB_URL="http://localhost:3000"
MOBILE_URL="http://localhost:8081"
ALLOWED_ORIGINS="http://localhost:19006,http://127.0.0.1:19006"
```

### Web env (`web/.env.local`)

```dotenv
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
BACKEND_API_URL="http://localhost:5000/api"
YOLO_API_URL="http://localhost:8000/predict"
```

### Mobile env (`mobile/.env`)

```dotenv
EXPO_PUBLIC_API_URL="http://localhost:5000/api"
EXPO_PUBLIC_YOLO_API_URL="http://localhost:8000/predict"
```

## 3) Prepare Database

Run Prisma migration and seed from the root:

```bash
npm run db:migrate
npm run db:seed
```

Default seed accounts:

- Admin: `admin@bluewaste.ph` / `@Admin123*`
- Worker: `worker@bluewaste.ph` / `worker123`
- Citizen: `citizen@bluewaste.ph` / `citizen123`

## 4) Run the Apps

Use separate terminals.

Backend API:

```bash
npm run backend:dev
```

Web app:

```bash
npm run web:dev
```

Mobile app:

```bash
cd mobile
npm run start
```

## Optional: Run YOLO Locally

```bash
cd yolo-fastapi-sample
python -m venv .venv
```

PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

If you deploy YOLO to Railway, set `YOLO_API_URL` and `EXPO_PUBLIC_YOLO_API_URL` to your deployed `/predict` endpoint.

## Useful Commands

From root:

```bash
npm run backend:typecheck
npm run web:typecheck
npm run mobile:typecheck
npm run backend:build
npm run web:build
npm run db:studio
```

## Deployment Notes

- `vercel.json` rewrites `/api/*` to the backend serverless function while Next.js handles frontend routes directly.
- In production, set environment variables in your hosting provider (Vercel, Railway, etc.).
