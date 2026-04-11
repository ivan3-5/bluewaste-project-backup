# BlueWaste System Diagrams

## System Analysis

### Architecture Overview

BlueWaste is a multi-client, service-oriented waste management platform composed of:

- Frontend clients:
  - Web app (Next.js) for citizen, field worker, LGU admin, and resort admin workflows
  - Mobile app (Expo/React Native) for citizen and field worker operations
- Backend API:
  - Node.js + Express REST API with JWT authentication and role-based authorization
  - Core domain modules: reports, users, analytics, notifications, uploads, resort boxes, barangays, waste-reports
- AI service:
  - FastAPI + YOLO endpoint (`POST /predict`) for image-based waste detection (`CLEAN` or `DIRTY`)
- Data and storage:
  - PostgreSQL via Prisma for transactional data
  - Cloudinary for report/cleanup/annotated image storage

### Primary Actors and Responsibilities

- Citizen
  - Register/login, submit reports with geolocation and images, track own reports, read notifications
- LGU Admin
  - Review all reports, run AI image analysis, assign workers, update statuses, manage users, manage resort boxes, view analytics/export data
- Field Worker
  - View assigned tasks, update cleanup statuses, upload cleanup evidence images, read notifications
- Resort Admin
  - View reports scoped to owned resort boxes (geofenced areas)
- External Systems
  - YOLO FastAPI service for object detection and report image analysis
  - Cloudinary for image upload and retrieval URLs

### Core Functional Flow

1. Citizen submits a waste report with location and metadata.
2. Backend stores report in PostgreSQL and auto-matches a resort box by geo-bounds.
3. Images are uploaded to Cloudinary and persisted in `ReportImage` records.
4. LGU Admin can analyze report images; backend calls YOLO, updates analysis fields, and can mark spam (`isSpam=true`, `REJECTED`) for clean/no-waste images.
5. LGU Admin assigns reports to field workers; workers update status from active cleanup to completion.
6. Notification records are generated for admins, assigned workers, and reporters during lifecycle events.
7. Map, heatmap, and analytics endpoints aggregate report data for operational monitoring.
8. Citizen web AI detection can classify uploaded images through the YOLO service for on-demand waste typing.

### Key Domain Data Objects

- `User`, `Barangay`, `ResortArea`
- `Report`, `ReportImage`, `StatusHistory`
- `Notification`, `ActivityLog`
- `WasteReport` (AI-detection-oriented report log)

## Use Case Diagram

```plantuml
@startuml
left to right direction

actor Citizen
actor "LGU Admin" as LGU
actor "Field Worker" as Worker
actor "Resort Admin" as ResortAdmin
actor "Public User" as Public
actor "YOLO FastAPI Service" as YOLO
actor Cloudinary

rectangle "BlueWaste System" {
  usecase "Register/Login" as UC1
  usecase "Manage Profile" as UC2
  usecase "Create Waste Report" as UC3
  usecase "Upload Report/Cleanup Images" as UC4
  usecase "View Map & Heatmap" as UC5
  usecase "Track Own Reports" as UC6
  usecase "Analyze Report Image" as UC7
  usecase "Mark Spam / Restore Spam" as UC8
  usecase "Assign Report to Worker" as UC9
  usecase "Update Report Status" as UC10
  usecase "View Assigned Tasks" as UC11
  usecase "Manage Users" as UC12
  usecase "Manage Resort Boxes" as UC13
  usecase "View Analytics & Export CSV" as UC14
  usecase "Read Notifications" as UC15
  usecase "Analyze Waste Image (Citizen AI)" as UC16
}

Citizen --> UC1
Citizen --> UC2
Citizen --> UC3
Citizen --> UC4
Citizen --> UC5
Citizen --> UC6
Citizen --> UC15
Citizen --> UC16

LGU --> UC1
LGU --> UC2
LGU --> UC5
LGU --> UC7
LGU --> UC8
LGU --> UC9
LGU --> UC10
LGU --> UC12
LGU --> UC13
LGU --> UC14
LGU --> UC15

Worker --> UC1
Worker --> UC2
Worker --> UC4
Worker --> UC10
Worker --> UC11
Worker --> UC15

ResortAdmin --> UC1
ResortAdmin --> UC2
ResortAdmin --> UC5
ResortAdmin --> UC15

Public --> UC5

UC4 --> Cloudinary : stores images
UC7 --> YOLO : runs detection
UC16 --> YOLO : runs detection

UC3 ..> UC15 : <<triggers>>
UC9 ..> UC15 : <<triggers>>
UC10 ..> UC15 : <<triggers>>
UC7 ..> UC10 : <<may update status>>
UC7 ..> UC8 : <<spam decision>>

@enduml
```

## ERD

```mermaid
erDiagram
  USER {
    string id PK
    string email UK
    string password
    string firstName
    string lastName
    string role
    boolean isActive
    string barangayId FK
    datetime createdAt
    datetime updatedAt
  }

  BARANGAY {
    string id PK
    string name UK
    float latitude
    float longitude
    json boundaryGeoJSON
    datetime createdAt
  }

  RESORT_BOX {
    string id PK
    string name UK
    string description
    float minLat
    float maxLat
    float minLng
    float maxLng
    boolean isActive
    string ownerId FK
    string createdById FK
    datetime createdAt
    datetime updatedAt
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
    boolean isSpam
    datetime spamMarkedAt
    string spamReason
    string analysisStatus
    int analysisWasteCount
    float analysisConfidence
    datetime analyzedAt
    string reporterId FK
    string assignedToId FK
    string barangayId FK
    string resortBoxId FK
    datetime createdAt
    datetime updatedAt
  }

  REPORT_IMAGE {
    string id PK
    string reportId FK
    string imageUrl
    string publicId
    string type
    datetime createdAt
  }

  STATUS_HISTORY {
    string id PK
    string reportId FK
    string changedById FK
    string previousStatus
    string newStatus
    string notes
    datetime createdAt
  }

  NOTIFICATION {
    string id PK
    string userId FK
    string reportId FK
    string title
    string message
    string type
    boolean isRead
    datetime createdAt
  }

  ACTIVITY_LOG {
    string id PK
    string userId FK
    string action
    string entityType
    string entityId
    json metadata
    datetime createdAt
  }

  WASTE_REPORT {
    string id PK
    string reporterId FK
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
  }

  BARANGAY ||--o{ USER : assigned_users
  BARANGAY ||--o{ REPORT : located_reports

  USER ||--o{ REPORT : reporter
  USER ||--o{ REPORT : assigned_worker
  USER ||--o{ STATUS_HISTORY : changes
  USER ||--o{ NOTIFICATION : receives
  USER ||--o{ ACTIVITY_LOG : logs
  USER ||--o{ WASTE_REPORT : owns
  USER ||--o{ RESORT_BOX : owns_as_resort_admin
  USER ||--o{ RESORT_BOX : creates_as_lgu_admin

  RESORT_BOX ||--o{ REPORT : routes_reports

  REPORT ||--o{ REPORT_IMAGE : has
  REPORT ||--o{ STATUS_HISTORY : lifecycle_history
  REPORT ||--o{ NOTIFICATION : triggers
```

## DFD

### DFD Level 1 (BlueWaste Platform)

```mermaid
flowchart LR
  Citizen[Citizen]
  LGU[LGU Admin]
  Worker[Field Worker]
  ResortAdmin[Resort Admin]
  Public[Public User]
  YOLO[YOLO FastAPI Service]
  Cloudinary[Cloudinary]

  P1((P1 Auth and Access Control))
  P2((P2 Report Intake and Geotagging))
  P3((P3 Image Upload Management))
  P4((P4 AI Analysis and Spam Decision))
  P5((P5 Assignment and Cleanup Tracking))
  P6((P6 Notification Management))
  P7((P7 Map Heatmap and Analytics))
  P8((P8 Citizen AI Waste Detection))

  D1[(D1 User)]
  D2[(D2 Report)]
  D3[(D3 ReportImage)]
  D4[(D4 StatusHistory)]
  D5[(D5 Notification)]
  D6[(D6 Barangay)]
  D7[(D7 ResortArea)]

  Citizen -->|registration login profile| P1
  LGU -->|registration login profile| P1
  Worker -->|registration login profile| P1
  ResortAdmin -->|registration login profile| P1
  P1 <--> D1

  Citizen -->|report details location priority| P2
  LGU -->|review/filter report list| P2
  ResortAdmin -->|scoped report queries| P2
  P2 <--> D2
  P2 -->|geo-boundary lookup| D7
  P2 <--> D6
  P2 -->|initial status event| D4
  P2 -->|new report event| P6

  Citizen -->|report image file| P3
  Worker -->|cleanup image file| P3
  LGU -->|image management| P3
  P3 -->|upload/delete image| Cloudinary
  Cloudinary -->|image URL publicId| P3
  P3 <--> D3

  LGU -->|analyze report image request| P4
  P4 -->|fetch report image reference| D3
  P4 <--> D2
  P4 -->|inference request| YOLO
  YOLO -->|labels count confidence status| P4
  P4 -->|analysis fields spam decision| D2
  P4 -->|status change record| D4
  P4 -->|analysis outcome event| P6

  LGU -->|assign worker| P5
  Worker -->|status updates cleanup notes| P5
  P5 <--> D2
  P5 <--> D4
  P5 -->|assignment and status events| P6

  P6 <--> D5
  P6 -->|new report alert| LGU
  P6 -->|new area report alert| ResortAdmin
  P6 -->|assignment alert| Worker
  P6 -->|status update alert| Citizen

  LGU -->|overview trends categories export| P7
  Citizen -->|map heatmap view| P7
  Worker -->|assigned map view| P7
  ResortAdmin -->|scoped map heatmap view| P7
  Public -->|public map heatmap view| P7
  P7 <--> D2
  P7 <--> D6
  P7 <--> D7

  Citizen -->|image for AI classification| P8
  P8 -->|inference request| YOLO
  YOLO -->|classification and confidence| P8
  P8 -->|AI result| Citizen
```
