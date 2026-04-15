You are a senior mobile and full-stack engineer.

I have an existing system called BlueWaste System with the following architecture:

Mobile App: React Native (to be replaced)
Web Admin Dashboard: Next.js (must remain unchanged)
Backend: Existing API (must NOT be rewritten)
Database: Already existing and stable
API: Already working and must be reused (NO major backend changes)
🎯 TASK

Migrate the mobile application from React Native → Flutter while ensuring:

❗ CRITICAL CONSTRAINTS
Do NOT change or rewrite the backend system
Do NOT modify the existing API structure
Keep all endpoints the same
Keep database schema unchanged
Next.js admin dashboard must remain fully functional without any changes
Only replace the mobile frontend layer
📱 NEW MOBILE APP REQUIREMENTS (FLUTTER)

Rebuild the mobile app using Flutter with the same features as the existing React Native app:

Core Features:
User authentication (login/register via existing API)
Waste report submission (image + description + GPS location)
Image upload using existing API endpoints
View user reports and status updates
Real-time or periodic status refresh (PENDING, VERIFIED, CLEANED)
Profile management (if existing in API)
🔌 API INTEGRATION RULES
Use existing API endpoints ONLY (no new backend logic)
Maintain same request/response format
Example:
POST /api/login
POST /api/reports
GET /api/reports/user/:id
Use HTTP client in Flutter (e.g. dio or http package)
Handle authentication token (JWT or session-based)
🧱 ARCHITECTURE AFTER MIGRATION

The final system should remain:

Flutter Mobile App
        │
        ▼
   Existing Backend API
        │
   ┌────┴─────┐
   ▼          ▼
Database   Next.js Admin Dashboard
🧩 IMPLEMENTATION REQUIREMENTS
Build clean Flutter folder structure (features-based preferred)
Separate API service layer (auth_service, report_service, etc.)
Use state management (Provider, Riverpod, or Bloc)
Ensure smooth image upload and GPS integration
Ensure UI matches or improves existing React Native UX
⚠️ IMPORTANT
Focus only on replacing frontend mobile layer
Do NOT suggest backend redesign
Do NOT modify Next.js dashboard
Ensure full compatibility with existing system
🎯 OUTPUT EXPECTED

Provide:

Flutter project structure
API service integration code
Key screens implementation plan
Migration steps per module
Any risks or issues during migration