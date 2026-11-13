# 🌿 EcoMonitor - Environmental Telemetry Platform (AQI & WQI)

An end-to-end full-stack IoT telemetry application designed to monitor, analyze, and visualize real-time **Air Quality Index (AQI)** and **Water Quality Index (WQI)**.

---

## 🏛️ System Architecture

```text
  +-------------------------------------------------------------+
  |                   React Native (Expo) App                   |
  |         - Real-time AQI/WQI Cards & Color Coded Badges      |
  |         - Station Switcher & Detailed Parameter Breakdown   |
  +------------------------------+------------------------------+
                                 | HTTP / REST (JSON)
                                 v
  +-------------------------------------------------------------+
  |                 Node.js + Express Backend                   |
  |                (TypeScript & Prisma ORM)                    |
  |   GET /api/locations            POST /api/mock-sensor       |
  +------------------------------+------------------------------+
                                 | SQL Queries via Prisma Client
                                 v
  +-------------------------------------------------------------+
  |                    PostgreSQL Database                      |
  |           [locations] <--- 1:N ---> [air_readings]          |
  |                       <--- 1:N ---> [water_readings]        |
  +-------------------------------------------------------------+
```

---

## 📂 Project Structure

```text
EcoTrack/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema models & relations
│   │   └── seed.ts             # Initial test stations & readings
│   ├── src/
│   │   └── server.ts           # Express API server & routes
│   ├── .env.example            # Environment variable template
│   ├── package.json            # Node.js dependencies and scripts
│   └── tsconfig.json           # TypeScript configuration
└── mobile/
    ├── App.tsx                 # Mobile UI with dynamic color coding
    ├── app.json                # Expo application configuration
    ├── package.json            # React Native dependencies
    └── tsconfig.json           # Mobile TypeScript configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) running locally or in Docker
- [Expo Go](https://expo.dev/go) app installed on your physical device (or iOS Simulator / Android Emulator)

---

### Step 1: Backend Setup

1. Open your terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` if your PostgreSQL username, password, or database name differs.*

4. Run Prisma database migration:
   ```bash
   npx prisma migrate dev --name init
   ```

5. Seed the database with demo stations (Central City Park & Riverside Industrial Zone):
   ```bash
   npm run seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```
   The server will start at `http://localhost:5001`.

---

### Step 2: Mobile App Setup

1. Open a new terminal tab and navigate to the mobile folder:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

> 💡 **Networking Tip for Mobile Testing:**
> - **iOS Simulator:** Works directly with `http://localhost:5001`.
> - **Android Emulator:** Change `API_BASE_URL` in `App.tsx` to `http://10.0.2.2:5001`.
> - **Physical Phone (Expo Go):** Change `API_BASE_URL` in `App.tsx` to your machine's LAN IP (e.g., `http://192.168.1.15:5001`).

---

## 📡 REST API Reference

### 1. Health Check
```http
GET /api/health
```

### 2. Fetch All Locations & Latest Telemetry
```http
GET /api/locations
```
**Response Preview:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Central City Park",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "latestAirReading": {
        "id": 2,
        "pm25": 14.0,
        "pm10": 28.5,
        "co2": 415.0,
        "aqi_score": 42.0,
        "timestamp": "2026-11-13T09:20:00.000Z"
      },
      "latestWaterReading": {
        "id": 1,
        "ph": 7.4,
        "turbidity": 2.1,
        "dissolved_oxygen": 7.8,
        "wqi_score": 88.5,
        "timestamp": "2026-11-13T09:20:00.000Z"
      }
    }
  ]
}
```

### 3. Ingest Simulated IoT Telemetry
```http
POST /api/mock-sensor
Content-Type: application/json
```

**Air Ingestion Example:**
```bash
curl -X POST http://localhost:5001/api/mock-sensor \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": 1,
    "type": "air",
    "pm25": 22.4,
    "pm10": 45.0,
    "co2": 420.0,
    "aqi_score": 48.0
  }'
```

**Water Ingestion Example:**
```bash
curl -X POST http://localhost:5001/api/mock-sensor \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": 1,
    "type": "water",
    "ph": 7.3,
    "turbidity": 3.0,
    "dissolved_oxygen": 7.5,
    "wqi_score": 85.0
  }'
```

---

## 🎨 UI Color-Coding Standard

| Index | Value Range | Status | Color | Representation |
|---|---|---|---|---|
| **AQI** | 0 – 50 | Good | 🟢 Green (`#10B981`) | Clean air, minimal risk |
| **AQI** | 51 – 100 | Moderate | 🟡 Amber (`#F59E0B`) | Acceptable air quality |
| **AQI** | 101 – 150 | Sensitive Alert | 🟠 Orange (`#F97316`) | Unhealthy for sensitive groups |
| **AQI** | > 150 | Unhealthy / Hazardous | 🔴 Red (`#EF4444`) | Serious pollution |
| **WQI** | 80 – 100 | Excellent / Good | 🟢 Green (`#10B981`) | Safe for consumption/aquatic life |
| **WQI** | 50 – 79 | Moderate | 🟡 Amber (`#F59E0B`) | Moderate quality, needs treatment |
| **WQI** | < 50 | Poor / Contaminated | 🔴 Red (`#EF4444`) | Severely contaminated |

---

## 🎓 University Presentation Walkthrough

1. **Architecture Slide:** Present the decoupled client-server architecture with Express and Expo.
2. **Schema & ORM Slide:** Highlight Prisma's type-safety, relational indexing, and cascade delete features.
3. **Live Demonstration:**
   - Open the app to view **Central City Park** (shows **Green** status for both AQI 42 & WQI 88.5).
   - Switch tabs to **Riverside Industrial Zone** (instantly triggers **Red** state for AQI 172 & WQI 38).
   - Tap **"Simulate Incoming IoT Telemetry"** or fire a `curl` POST to demonstrate dynamic backend data ingestion and instant pull-to-refresh!

