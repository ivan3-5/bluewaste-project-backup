# BlueWaste Mobile (Flutter)

This Flutter app replaces the existing React Native mobile app while reusing the same backend API and database.

## Constraints Followed

- Backend API is reused as-is.
- API routes and payload formats are unchanged.
- Database schema is unchanged.
- Next.js admin dashboard remains untouched.

## Run

1. Install dependencies.
2. Run with an API base URL that points to the existing backend.

Example:

flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api

## Implemented Endpoint Targets

- POST /auth/login
- POST /auth/register
- GET /auth/me
- PUT /auth/profile
- POST /reports
- POST /reports/{id}/images
- GET /reports/my-reports
- GET /reports/assigned
- PUT /reports/{id}/status
- GET /reports/map
- GET /notifications
- PUT /notifications/{id}/read
- PUT /notifications/read-all

## Build Profiles

Set API base URL per environment with --dart-define=API_BASE_URL=<url>.
