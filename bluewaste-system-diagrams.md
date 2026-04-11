# BlueWaste System Analysis and Diagrams

## 1) System Analysis (Current As-Is)

This analysis is based on the current implementation in:

- Backend routes and controllers in `backend/src`
- Prisma schema in `backend/prisma/schema.prisma`
- Prisma migration SQL files in `backend/prisma/migrations/*/migration.sql`
- Web and mobile route structure in `web/src/app` and `mobile/app`

### 1.1 Core Components

1. Client Applications

- Web app (Next.js): citizen portal, LGU/resort dashboard, field worker dashboard
- Mobile app (Expo): citizen and field worker flows

2. API Layer

- Express REST API with JWT auth
- Role-based authorization (`CITIZEN`, `LGU_ADMIN`, `RESORT_ADMIN`, `FIELD_WORKER`)

3. Data Layer

- PostgreSQL via Prisma
- Main entities: `User`, `Report`, `ReportImage`, `StatusHistory`, `Notification`, `Barangay`, `ResortArea`, `WasteReport`, `ActivityLog`

4. External Services

- Cloudinary for image storage
- YOLO FastAPI for report-image analysis and AI-assisted waste classification

### 1.2 High-Value Business Flows

1. Report lifecycle

- Citizen submits report with location and optional anonymity.
- System auto-matches `ResortArea` by lat/lng bounds.
- LGU can analyze report image using YOLO.
- LGU assigns field worker.
- Worker updates status until `CLEANED`.

2. AI moderation flow

- LGU calls analyze action on a report image.
- YOLO returns decision (`DIRTY` or `CLEAN`) and detection metadata.
- `CLEAN` result moves report to spam queue (`isSpam=true`, `status=REJECTED`) and becomes eligible for auto soft-delete by retention.

3. Geo and monitoring flow

- Public and authenticated users can view map/heatmap data.
- Dashboard analytics provide trends, category distribution, barangay stats, and CSV export.

4. Notification flow

- New report, assignment, and status transitions create user notifications.

---

## 2) Use Case Diagram

```mermaid
flowchart LR
  Citizen[Citizen]
  LGU[LGU Admin]
  Worker[Field Worker]
  ResortAdmin[Resort Admin]
  Public[Public User]
  YOLO[YOLO FastAPI Service]
  Cloudinary[Cloudinary]

  subgraph BW[BlueWaste System]
    UC1((Register / Login))
    UC2((Manage Profile))
    UC3((Submit Waste Report))
    UC4((Track Own Reports))
    UC5((Upload Report and Cleanup Images))
    UC6((View Map and Heatmap))
    UC7((Analyze Report Image))
    UC8((Manage Spam Queue))
    UC9((Assign Report to Worker))
    UC10((Update Report Status))
    UC11((Manage Users))
    UC12((Manage Resort Areas))
    UC13((View Analytics and Export CSV))
    UC14((Read Notifications))
    UC15((Create Personal AI Waste Report))
    UC16((View Area-Scoped Reports))
  end

  Citizen --> UC1
  Citizen --> UC2
  Citizen --> UC3
  Citizen --> UC4
  Citizen --> UC5
  Citizen --> UC6
  Citizen --> UC14
  Citizen --> UC15

  LGU --> UC1
  LGU --> UC2
  LGU --> UC6
  LGU --> UC7
  LGU --> UC8
  LGU --> UC9
  LGU --> UC10
  LGU --> UC11
  LGU --> UC12
  LGU --> UC13
  LGU --> UC14

  Worker --> UC1
  Worker --> UC2
  Worker --> UC5
  Worker --> UC6
  Worker --> UC10
  Worker --> UC14

  ResortAdmin --> UC1
  ResortAdmin --> UC2
  ResortAdmin --> UC6
  ResortAdmin --> UC14
  ResortAdmin --> UC16

  Public --> UC6

  UC5 --> Cloudinary
  UC7 --> YOLO
  UC15 --> YOLO

  UC3 -. triggers .-> UC14
  UC9 -. triggers .-> UC14
  UC10 -. triggers .-> UC14
  UC7 -. may update .-> UC10
  UC7 -. may classify .-> UC8
```

---

## 3) ERD Physical Model

### 3.1 ERD (Entity Relationships)

```mermaid
erDiagram
  User {
    TEXT id PK
    TEXT email UK
    TEXT password
    TEXT firstName
    TEXT lastName
    TEXT phone
    Role role
    TEXT avatarUrl
    BOOLEAN isActive
    TIMESTAMP createdAt
    TIMESTAMP updatedAt
    TEXT barangayId FK
  }

  Barangay {
    TEXT id PK
    TEXT name UK
    DOUBLE latitude
    DOUBLE longitude
    JSONB boundaryGeoJSON
    TIMESTAMP createdAt
  }

  ResortArea {
    TEXT id PK
    TEXT name UK
    TEXT description
    DOUBLE minLat
    DOUBLE maxLat
    DOUBLE minLng
    DOUBLE maxLng
    BOOLEAN isActive
    TIMESTAMP createdAt
    TIMESTAMP updatedAt
    TEXT ownerId FK
    TEXT createdById FK
  }

  Report {
    TEXT id PK
    TEXT title
    TEXT description
    WasteCategory category
    ReportStatus status
    Priority priority
    DOUBLE latitude
    DOUBLE longitude
    TEXT address
    BOOLEAN isAnonymous
    BOOLEAN isDeleted
    BOOLEAN isSpam
    AnalysisStatus analysisStatus
    INTEGER analysisWasteCount
    DOUBLE analysisConfidence
    TIMESTAMP analyzedAt
    TIMESTAMP spamMarkedAt
    TEXT spamReason
    TIMESTAMP createdAt
    TIMESTAMP updatedAt
    TEXT reporterId FK
    TEXT assignedToId FK
    TEXT barangayId FK
    TEXT resortAreaId FK
  }

  ReportImage {
    TEXT id PK
    TEXT imageUrl
    TEXT publicId
    ImageType type
    TIMESTAMP createdAt
    TEXT reportId FK
  }

  StatusHistory {
    TEXT id PK
    ReportStatus previousStatus
    ReportStatus newStatus
    TEXT notes
    TIMESTAMP createdAt
    TEXT reportId FK
    TEXT changedById FK
  }

  Notification {
    TEXT id PK
    TEXT title
    TEXT message
    NotificationType type
    BOOLEAN isRead
    TIMESTAMP createdAt
    TEXT userId FK
    TEXT reportId FK
  }

  ActivityLog {
    TEXT id PK
    TEXT action
    TEXT entityType
    TEXT entityId
    JSONB metadata
    TIMESTAMP createdAt
    TEXT userId FK
  }

  WasteReport {
    TEXT id PK
    TEXT imageUrl
    TEXT detectedObject
    AiWasteType wasteType
    DOUBLE confidence
    DOUBLE latitude
    DOUBLE longitude
    TEXT address
    TEXT_ARRAY labels
    TIMESTAMP createdAt
    TIMESTAMP updatedAt
    TEXT reporterId FK
  }

  Barangay ||--o{ User : has_users
  Barangay ||--o{ Report : has_reports

  User ||--o{ Report : submits
  User ||--o{ Report : assigned_to
  User ||--o{ StatusHistory : changes_status
  User ||--o{ Notification : receives
  User ||--o{ ActivityLog : creates
  User ||--o{ WasteReport : owns
  User ||--o{ ResortArea : owns_area
  User ||--o{ ResortArea : creates_area

  ResortArea ||--o{ Report : scoped_reports

  Report ||--o{ ReportImage : has_images
  Report ||--o{ StatusHistory : has_history
  Report ||--o{ Notification : notification_context
```

### 3.2 Physical Model Notes (PostgreSQL)

1. Enum types

- `Role`: `CITIZEN`, `LGU_ADMIN`, `RESORT_ADMIN`, `FIELD_WORKER`
- `ReportStatus`: `PENDING`, `VERIFIED`, `CLEANUP_SCHEDULED`, `IN_PROGRESS`, `CLEANED`, `REJECTED`
- `WasteCategory`: `SOLID_WASTE`, `HAZARDOUS`, `LIQUID`, `RECYCLABLE`, `ORGANIC`, `ELECTRONIC`, `OTHER`
- `Priority`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `ImageType`: `REPORT`, `CLEANUP`
- `NotificationType`: `NEW_REPORT`, `STATUS_CHANGE`, `ASSIGNMENT`, `SYSTEM`
- `AiWasteType`: `RECYCLABLE`, `NON_RECYCLABLE`, `ORGANIC`
- `AnalysisStatus`: `DIRTY`, `CLEAN`

2. Important index groups

- `Report`: status/category/filtering indexes plus composite operational indexes, including spam and resort-area access paths.
- `Notification`: `(userId, isRead)` and `(userId, createdAt)` for inbox and badge counts.
- `ResortArea`: owner and active-range indexes for area lookup and ownership queries.
- `WasteReport`: `(reporterId, createdAt)` for personal AI history timeline.

3. FK behavior highlights

- `ReportImage -> Report`: `ON DELETE CASCADE`
- `StatusHistory -> Report`: `ON DELETE CASCADE`
- `Notification -> User`: `ON DELETE CASCADE`
- `Notification -> Report`: `ON DELETE SET NULL`
- `Report -> User/Barangay/ResortArea`: mostly `ON DELETE SET NULL`

4. Type note

- Prisma stores IDs as `TEXT` in current migrations, not native `UUID` columns.

---

## 4) DFD Level 0 (Context Diagram)

```mermaid
flowchart LR
  Citizen[Citizen]
  LGU[LGU Admin]
  Worker[Field Worker]
  ResortAdmin[Resort Admin]
  Public[Public User]
  YOLO[YOLO FastAPI Service]
  Cloudinary[Cloudinary]

  P0((0. BlueWaste Platform))

  Citizen -->|registration, report submission, report tracking, AI request| P0
  P0 -->|auth result, report status, map view, notifications| Citizen

  LGU -->|report moderation, worker assignment, analytics queries, spam actions| P0
  P0 -->|dashboard data, report queues, export files, notifications| LGU

  Worker -->|assigned task updates, cleanup photos, status changes| P0
  P0 -->|assignments, map context, notifications| Worker

  ResortAdmin -->|area-scoped report and map requests| P0
  P0 -->|area-scoped reports, heatmap, notifications| ResortAdmin

  Public -->|public map and heatmap queries| P0
  P0 -->|public geospatial output| Public

  P0 -->|image analysis request| YOLO
  YOLO -->|classification and detection result| P0

  P0 -->|upload/delete media| Cloudinary
  Cloudinary -->|image URL and publicId| P0
```

---

## 5) DFD Level 1 (Process Decomposition)

```mermaid
flowchart LR
  Citizen[Citizen]
  LGU[LGU Admin]
  Worker[Field Worker]
  ResortAdmin[Resort Admin]
  Public[Public User]
  YOLO[YOLO FastAPI Service]
  Cloudinary[Cloudinary]

  P1((P1 Auth and Profile))
  P2((P2 Report Intake and Routing))
  P3((P3 Media Handling))
  P4((P4 AI Analysis and Spam Moderation))
  P5((P5 Assignment and Status Lifecycle))
  P6((P6 Notification Delivery))
  P7((P7 Geo Map Heatmap and Analytics))
  P8((P8 Personal AI Waste Reports))

  D1[(D1 User)]
  D2[(D2 Report)]
  D3[(D3 ReportImage)]
  D4[(D4 StatusHistory)]
  D5[(D5 Notification)]
  D6[(D6 Barangay)]
  D7[(D7 ResortArea)]
  D8[(D8 WasteReport)]

  Citizen -->|register/login/profile| P1
  LGU -->|register/login/profile| P1
  Worker -->|register/login/profile| P1
  ResortAdmin -->|register/login/profile| P1
  P1 <--> D1

  Citizen -->|report details and location| P2
  LGU -->|report list filters| P2
  ResortAdmin -->|area-scoped report list| P2
  P2 <--> D2
  P2 -->|location validation| D6
  P2 -->|area matching by bounds| D7
  P2 -->|create initial status| D4
  P2 -->|new report event| P6

  Citizen -->|report image upload| P3
  Worker -->|cleanup proof upload| P3
  LGU -->|media maintenance| P3
  P3 -->|upload/delete image| Cloudinary
  Cloudinary -->|media URL/publicId| P3
  P3 <--> D3

  LGU -->|analyze report image| P4
  P4 -->|fetch target image| D3
  P4 -->|read/update report analysis fields| D2
  P4 -->|record status shift when needed| D4
  P4 -->|YOLO inference request| YOLO
  YOLO -->|status, labels, confidence| P4
  P4 -->|analysis/spam outcome event| P6

  LGU -->|assign field worker| P5
  Worker -->|update cleanup status| P5
  P5 <--> D2
  P5 <--> D4
  P5 -->|assignment/status event| P6

  P6 <--> D5
  P6 -->|new report alerts| LGU
  P6 -->|area report alerts| ResortAdmin
  P6 -->|assignment/status alerts| Worker
  P6 -->|status alerts| Citizen

  Public -->|public map and heatmap request| P7
  Citizen -->|map and heatmap request| P7
  LGU -->|dashboard map/analytics/export request| P7
  Worker -->|assigned-location map request| P7
  ResortAdmin -->|area-scoped map/analytics request| P7
  P7 <--> D2
  P7 <--> D6
  P7 <--> D7

  Citizen -->|personal AI classify request| P8
  P8 -->|YOLO inference request| YOLO
  YOLO -->|classification result| P8
  P8 <--> D8
  P8 -->|AI response payload| Citizen
```
