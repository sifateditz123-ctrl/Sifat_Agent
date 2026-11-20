# Sifat Agent — Backend API Integration Guide

## Overview

The Android app (`SifatApiClient.kt`) communicates exclusively over HTTPS (`network_security_config.xml` blocks cleartext traffic in release builds) with the Express backend (`server.ts`). The backend wraps `@google/genai` (`gemini-4-hydrogen`) using strict JSON schema output and runs server-side allow-list validation before returning an `ActionPlan`.

## Endpoints

### 1. `GET /api/health`
Returns service readiness and whether `GEMINI_API_KEY` is configured on the server.

### 2. `POST /api/auth/session`
Issues a short-lived (15-minute) Bearer session token.
```json
{
  "token": "a1b2c3...",
  "expiresAtEpochMs": 1763650000000
}
```
The Android client caches this token in `EncryptedSharedPreferences` (`AES256_GCM`). For production multi-user deployments, replace `/api/auth/session` with Firebase Auth ID token verification or OIDC.

### 3. `POST /api/agent/interpret`
**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "prompt": "রহিমকে মেসেজ পাঠাও আমি ১০ মিনিটে আসছি",
  "preferredLanguage": "bi",
  "screenSummary": "Optional user-authorized non-password screen text",
  "installedAppNames": ["YouTube", "WhatsApp", "Settings", "Chrome"]
}
```

**Response (`200 OK`)**:
```json
{
  "modelUsed": "gemini-4-hydrogen",
  "plan": {
    "intentType": "clarification",
    "replyText": "রহিমের ফোন নম্বরটি বলবেন? মেসেজ পাঠানোর আগে আমি প্রিভিউ দেখাব।",
    "replyLanguage": "bn",
    "clarifyingQuestion": "Please provide Rahims phone number.",
    "steps": []
  }
}
```

## Connecting the Android App

1. Deploy `server.ts` to an HTTPS host (e.g., Cloud Run via `APP_URL`).
2. Set `GEMINI_API_KEY` in the server environment secrets (never in `gradle.properties` or Android code).
3. In `/android/gradle.properties`, set:
   ```properties
   SIFAT_BACKEND_BASE_URL=https://your-deployed-service.run.app/
   ```
4. For local Android Emulator testing against a backend running on your workstation port `3000`:
   ```properties
   SIFAT_BACKEND_BASE_URL=http://10.0.2.2:3000/
   ```
   (`network_security_config.xml` allows cleartext to `10.0.2.2` strictly in debug builds.)
