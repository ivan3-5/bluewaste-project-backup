# BlueWaste System Analysis and Diagrams

## 1) Current System Analysis

### Architecture Snapshot

- Client apps: Next.js web app and Expo mobile app
- Main API: Node.js + Express backend with route modules for auth, reports, users, barangays, notifications, analytics, uploads, and AI waste reports
- Primary database: PostgreSQL via Prisma ORM
- External services:
  - Cloudinary for image storage and deletion
  - YOLO FastAPI service for image-based waste detection

### Main Actors

- Citizen: submits reports, tracks personal reports, receives notifications, and uses AI-assisted waste detection
- Field Worker: views assigned reports, uploads evidence images, and updates cleanup status
- LGU Admin: manages users, assigns workers, updates report lifecycle, monitors analytics, and exports data
- Public User: can view report map/heatmap/list and barangay ranking/statistics

### Core Functional Areas

- Identity and access: register/login, profile retrieval/update, role-based authorization
- Report lifecycle: create report, assign worker, update status, soft-delete report, upload report images
- Operations visibility: map points, heatmap, barangay ranking, category distribution, trend/overview analytics, CSV export
- Notification engine: admin notifications on new reports, assignee notifications, reporter status updates, unread counters/read state
- AI-assisted reporting: YOLO prediction result is persisted as WasteReport data associated with a reporter

---

## 2) Use Case Diagram

```mermaid
flowchart LR
  Citizen[Citizen]
  Worker[Field Worker]
  Admin[LGU Admin]
  Public[Public User]
  YOLO[YOLO FastAPI Service]
  Cloudinary[Cloudinary]

  subgraph BW[BlueWaste System]
    UC1((Register and Login))
    UC2((Manage Profile))
    UC3((Submit Waste Report))
    UC4((View Public Reports and Map))
    UC5((View My Reports))
    UC6((View Assigned Reports))
    UC7((Assign Field Worker))
    UC8((Update Report Status))
    UC9((Manage Users))
    UC10((Upload Report Images))
    UC11((Receive and Read Notifications))
    UC12((View Analytics and Export CSV))
    UC13((Run AI Waste Detection))
    UC14((Save AI Waste Report Result))
  end

  Citizen --> UC1
  Citizen --> UC2
  Citizen --> UC3
  Citizen --> UC4
  Citizen --> UC5
  Citizen --> UC10
  Citizen --> UC11
  Citizen --> UC13

  Worker --> UC1
  Worker --> UC2
  Worker --> UC6
  Worker --> UC8
  Worker --> UC10
  Worker --> UC11

  Admin --> UC1
  Admin --> UC2
  Admin --> UC4
  Admin --> UC7
  Admin --> UC8
  Admin --> UC9
  Admin --> UC11
  Admin --> UC12

  Public --> UC4

  UC13 --> UC14
  UC13 --> YOLO
  UC10 --> Cloudinary
```

---

## 3) Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
  USER {
    string id PK
    string email UK
    string password
    string firstName
    string lastName
    string role
    string phone
    string avatarUrl
    boolean isActive
    datetime createdAt
    datetime updatedAt
    string barangayId FK
  }

  BARANGAY {
    string id PK
    string name UK
    float latitude
    float longitude
    json boundaryGeoJSON
    datetime createdAt
  }

  REPORT {
    string id PK
    string title
    string description
    string category
    string status
    string priority
    float latitude
    float longitude
    string address
    boolean isAnonymous
    boolean isDeleted
    datetime createdAt
    datetime updatedAt
    string reporterId FK
    string assignedToId FK
    string barangayId FK
  }

  REPORT_IMAGE {
    string id PK
    string imageUrl
    string publicId
    string type
    datetime createdAt
    string reportId FK
  }

  STATUS_HISTORY {
    string id PK
    string previousStatus
    string newStatus
    string notes
    datetime createdAt
    string reportId FK
    string changedById FK
  }

  NOTIFICATION {
    string id PK
    string title
    string message
    string type
    boolean isRead
    datetime createdAt
    string userId FK
    string reportId FK
  }

  ACTIVITY_LOG {
    string id PK
    string action
    string entityType
    string entityId
    json metadata
    datetime createdAt
    string userId FK
  }

  WASTE_REPORT {
    string id PK
    string imageUrl
    string detectedObject
    string wasteType
    float confidence
    float latitude
    float longitude
    string address
    string[] labels
    datetime createdAt
    datetime updatedAt
    string reporterId FK
  }

  BARANGAY ||--o{ USER : has
  BARANGAY ||--o{ REPORT : contains

  USER ||--o{ REPORT : reports_as_reporter
  USER ||--o{ REPORT : assigned_reports
  USER ||--o{ STATUS_HISTORY : changes_status
  USER ||--o{ NOTIFICATION : receives
  USER ||--o{ ACTIVITY_LOG : performs_action
  USER ||--o{ WASTE_REPORT : submits_ai_report

  REPORT ||--o{ REPORT_IMAGE : has_images
  REPORT ||--o{ STATUS_HISTORY : has_status_timeline
  REPORT ||--o{ NOTIFICATION : referenced_in
```

---

## 4) Data Flow Diagram (DFD Level 1)

```mermaid
flowchart LR
  Citizen[Citizen]
  Worker[Field Worker]
  Admin[LGU Admin]
  Public[Public User]
  YOLO[YOLO FastAPI]
  Cloudinary[Cloudinary]

  P1((P1 Auth and Profile Management))
  P2((P2 Report Submission and Retrieval))
  P3((P3 Assignment and Status Processing))
  P4((P4 Notification Processing))
  P5((P5 Analytics and Export))
  P6((P6 AI Detection and Waste Report Save))
  P7((P7 Image Upload and Attachment))

  D1[(D1 Users)]
  D2[(D2 Reports)]
  D3[(D3 Report Images)]
  D4[(D4 Status History)]
  D5[(D5 Notifications)]
  D6[(D6 Barangays)]
  D7[(D7 Waste Reports)]

  Citizen -->|register login profile| P1
  Worker -->|login profile| P1
  Admin -->|login profile| P1
  P1 <--> D1

  Citizen -->|new report details and location| P2
  Public -->|list map heatmap query| P2
  Admin -->|report monitoring query| P2
  Worker -->|assigned report lookup| P2
  P2 <--> D2
  P2 <--> D6

  Admin -->|assign worker| P3
  Worker -->|status updates and cleanup notes| P3
  P3 <--> D2
  P3 <--> D4
  P3 --> P4

  P2 -->|new report event| P4
  P4 <--> D5
  P4 -->|alerts| Citizen
  P4 -->|alerts| Worker
  P4 -->|alerts| Admin

  Admin -->|overview trends categories export| P5
  P5 <--> D2
  P5 <--> D6
  P5 -->|dashboard and csv| Admin

  Citizen -->|image for ai detection| P6
  P6 -->|predict request| YOLO
  YOLO -->|detections confidence labels| P6
  P6 <--> D7
  P6 -->|ai result| Citizen

  Citizen -->|report image file| P7
  Worker -->|cleanup evidence image| P7
  Admin -->|managed image upload| P7
  P7 -->|upload destroy| Cloudinary
  Cloudinary -->|url and publicId| P7
  P7 <--> D3
  P7 -->|linked image reference| P2
```
