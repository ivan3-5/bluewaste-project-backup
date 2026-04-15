# BlueWaste Mobile Migration Plan (React Native -> Flutter)

## Scope and Constraints

This migration replaces only the mobile frontend layer.

- Backend API: unchanged
- API routes: unchanged
- Database schema: unchanged
- Next.js admin dashboard: unchanged

## Flutter Project Structure

```
mobile_flutter/
  pubspec.yaml
  README.md
  MIGRATION_PLAN.md
  lib/
    main.dart
    src/
      app.dart
      core/
        config/
          app_env.dart
        network/
          api_exception.dart
        storage/
          session_storage.dart
        providers.dart
      features/
        auth/
          data/
            auth_service.dart
          domain/
            app_user.dart
          presentation/
            auth_controller.dart
            login_screen.dart
            register_screen.dart
            root_switcher_screen.dart
        dashboard/
          presentation/
            citizen_shell_screen.dart
            worker_shell_screen.dart
        reports/
          data/
            report_service.dart
          domain/
            report_models.dart
          presentation/
            citizen_home_screen.dart
            report_create_screen.dart
            my_reports_screen.dart
            worker_tasks_screen.dart
            reports_map_screen.dart
        notifications/
          data/
            notification_service.dart
          domain/
            app_notification.dart
          presentation/
            notifications_screen.dart
        profile/
          presentation/
            profile_screen.dart
```

## API Integration (Same Existing Endpoints)

### Authentication

- POST /api/auth/login
- POST /api/auth/register
- GET /api/auth/me
- PUT /api/auth/profile

Flutter mapping:

- auth_service.dart: login/register/getProfile/updateProfile
- auth_controller.dart: session load, login, register, logout, profile update
- session_storage.dart: secure token + user persistence

### Reports

- POST /api/reports
- POST /api/reports/{id}/images
- GET /api/reports/my-reports
- GET /api/reports/assigned
- PUT /api/reports/{id}/status
- GET /api/reports/map

Flutter mapping:

- report_service.dart: createReport, uploadReportImages, getMyReports, getAssignedReports, updateStatus, getMapReports
- report_create_screen.dart: report + image upload + GPS
- my_reports_screen.dart: citizen status tracking with periodic refresh
- worker_tasks_screen.dart: worker status updates + cleanup photo upload
- reports_map_screen.dart: map marker visualization for citizen and worker roles

### Notifications

- GET /api/notifications
- PUT /api/notifications/{id}/read
- PUT /api/notifications/read-all

Flutter mapping:

- notification_service.dart
- notifications_screen.dart with periodic refresh and read actions

## State Management and Architecture

- State management: Riverpod
- HTTP client: Dio
- Auth persistence: flutter_secure_storage
- Image upload: multipart/form-data with Dio + image_picker
- Location capture: geolocator
- Maps: flutter_map + OpenStreetMap tiles

## Key Screen Implementation Plan

### Common Entry Flow

1. RootSwitcher checks local session from secure storage.
2. If unauthenticated: show login/register.
3. If authenticated:
   - FIELD_WORKER -> Worker tab shell
   - Others (citizen) -> Citizen tab shell

### Citizen Tabs

1. Home: quick actions to report, reports list, map, alerts
2. Submit Report: title/description/category/location/image upload/anonymous flag
3. My Reports: list + status filter + pull-to-refresh + periodic refresh
4. Map: report marker map from /api/reports/map
5. Alerts: notification center with mark-read and mark-all

### Worker Tabs

1. Tasks: assigned reports + action buttons (start work, mark cleaned)
2. Assigned Map: marker map using assigned reports
3. Alerts: notification center

### Profile

- Show user profile data
- Update first name, last name, and phone via existing API
- Logout clears secure storage and returns to auth flow

## Migration Steps per Module

Operational runbook for production transition is documented in CUTOVER_CHECKLIST.md.

### Module 1: Foundation

1. Create new Flutter app folder and dependencies.
2. Configure API base URL with --dart-define.
3. Add secure session storage and Dio interceptors.

### Module 2: Auth

1. Implement user model + auth service.
2. Implement login/register screens.
3. Add session restore and root role switcher.

### Module 3: Citizen Reports

1. Implement report form with camera/gallery and location.
2. Integrate create report and upload endpoints.
3. Implement my reports with status filtering.

### Module 4: Worker Tasks

1. Implement assigned reports screen.
2. Integrate status transitions and cleanup uploads.
3. Add assigned map view.

### Module 5: Notifications + Profile

1. Implement notifications list with read actions.
2. Implement profile read/update and logout.
3. Add periodic refresh timers across list screens.

### Module 6: UAT + Cutover

1. Validate API contract parity against existing RN app.
2. Verify role flows with seeded accounts.
3. Run pilot rollout and then retire RN app usage.

## Risks and Mitigation

1. API payload mismatches

- Risk: backend returns optional fields not always present.
- Mitigation: defensive JSON parsing with sensible defaults in domain models.

2. Token/session expiry behavior

- Risk: inconsistent logout handling on 401.
- Mitigation: global Dio interceptor clears session on 401 and root switcher re-routes.

3. Mobile network variability

- Risk: intermittent failures for uploads and refresh polling.
- Mitigation: clear user-facing errors, manual pull-to-refresh, periodic refresh fallback.

4. Location/camera permission denial

- Risk: users cannot complete reports without permissions.
- Mitigation: explicit permission checks and user messaging before submission.

5. Map tile connectivity

- Risk: map tiles unavailable on poor networks.
- Mitigation: keep report list screens as primary operational fallback.

## Acceptance Checklist

- Login/register work using existing auth endpoints.
- Report submission with image + location works.
- Citizen can view own reports and status updates.
- Worker can view assigned tasks and update statuses.
- Notifications refresh and read actions work.
- Profile update works against existing /api/auth/profile endpoint.
- Backend and admin dashboard remain unchanged.
