# Sifat Agent — Bilingual Android AI Assistant

Sifat Agent is a bilingual (**Bangla + English**) voice-controlled Android personal assistant engineered with **Kotlin, Jetpack Compose, Material 3, MVVM + StateFlow, Room, DataStore, Android SpeechRecognizer / TextToSpeech, AccessibilityService**, and a **secure Node.js + Gemini backend proxy**.

## Repository Layout

```text
/
├── android/                        # Complete Native Android Studio Project (Kotlin + Compose)
│   ├── app/
│   │   ├── build.gradle.kts        # Compose BOM, Room, DataStore, Retrofit, Security Crypto, Release Signing
│   │   └── src/
│   │       ├── main/
│   │       │   ├── AndroidManifest.xml
│   │       │   ├── res/            # English & Bangla strings, themes, Accessibility config, network security
│   │       │   └── java/com/sifatagent/app/
│   │       │       ├── domain/     # Models, ActionValidator allow-list, CommandParser
│   │       │       ├── voice/      # SpeechInputManager, TextToSpeechManager, WakeWordForegroundService
│   │       │       ├── automation/ # SifatAccessibilityService, DeviceActionExecutor
│   │       │       ├── data/       # Room DB, DataStore SettingsRepository, Retrofit HTTPS SifatApiClient
│   │       │       └── ui/         # Material 3 Theme, AiOrb, ConfirmationDialog, 9 Compose Screens
│   │       └── test/               # JUnit4 tests (ActionValidatorTest, CommandParserTest)
│   └── gradle/libs.versions.toml
├── server.ts                       # Secure Express backend + Vite runtime
├── server/
│   ├── geminiPlanner.ts            # @google/genai gemini-4-hydrogen structured JSON planner
│   ├── rateLimiter.ts              # Sliding-window rate limiter & payload validator
│   └── projectManifest.ts          # Serves real Android project files to the Project Explorer
├── src/                            # Interactive Web Companion & Android Project Explorer
├── docs/
│   ├── API_INTEGRATION.md          # Backend API contract & Android HTTPS configuration
│   └── SIGNED_APK_GUIDE.md         # Keystore generation & signed release APK guide
└── README.md
```

## Security & Safety Architecture

1. **Zero API Keys in APK**: `GEMINI_API_KEY` stays strictly on the Node.js backend (`process.env.GEMINI_API_KEY`). The Android app authenticates via `POST /api/auth/session` (short-lived Bearer token stored in `EncryptedSharedPreferences`) or a provisioned `SIFAT_CLIENT_TOKEN`.
2. **Allow-Listed Automation**: `ActionValidator` (implemented in both Kotlin and TypeScript) validates every AI-generated action against a strict allow-list (`LAUNCH_APP`, `OPEN_SETTINGS`, `GO_HOME`, `GO_BACK`, `READ_SCREEN`, `CLICK_ELEMENT`, `SCROLL_SCREEN`, `OPEN_URL`, `SET_BRIGHTNESS`, `DIAL_NUMBER`, `COMPOSE_SMS`, `SHARE_CONTENT`).
3. **Mandatory Confirmation & Preview**: Sensitive operations (`DIAL_NUMBER`, `COMPOSE_SMS`, `SET_BRIGHTNESS`, `SHARE_CONTENT`) always require explicit user confirmation before opening Android's `ACTION_DIAL` or `ACTION_SENDTO` composer. Calls and SMS are never silently dispatched.
4. **Ethical Accessibility & Voice Controls**:
   - `SifatAccessibilityService` must be enabled manually by the user in Android Settings, is gated by an in-app master switch, skips `isPassword` nodes, and never logs or uploads passive screen events.
   - `WakeWordForegroundService` displays an ongoing foreground notification whenever enabled—no covert background microphone capture.

## Opening & Building the Android Project

> **Build Environment Note**: The AI Studio web container includes Node.js and Chromium (`playwright-cli`) for the secure backend and web companion, and does not include the Android SDK or Gradle daemon. To compile an `.apk` or run Kotlin JUnit tests:

1. Download or copy the `/android` directory (you can also use the **Download Android Project (.zip)** button inside the web Project Explorer).
2. Open `/android` in **Android Studio Ladybug (2024.2+)** or newer with **JDK 17** and **Android SDK 35**.
3. Update `SIFAT_BACKEND_BASE_URL` in `/android/gradle.properties` to your deployed HTTPS backend URL (or `http://10.0.2.2:3000/` when testing locally against the Android Emulator).
4. Run unit tests:
   ```bash
   cd android
   ./gradlew testDebugUnitTest
   ```
5. Build a debug APK:
   ```bash
   ./gradlew assembleDebug
   ```
6. For a signed release APK, follow `docs/SIGNED_APK_GUIDE.md`.

## Running the Secure Backend & Web Companion Locally

```bash
npm install
cp .env.example .env   # Set GEMINI_API_KEY
npm run dev            # Starts Express + Vite on http://localhost:3000
```

Run the TypeScript unit tests (`ActionValidator` & `RateLimiter`):
```bash
npx --yes tsx --test src/shared/actionValidator.test.ts server/rateLimiter.test.ts
```

## Documented Android OS Limitations

- **Wake-Word Acoustic Model**: `WakeWordForegroundService` provides the compliant foreground service and persistent microphone notification; production always-on offline `"Hey Sifat"` keyword spotting requires bundling an acoustic wake-word engine (e.g., Picovoice Porcupine or Vosk keyword model) inside the service loop.
- **Protected Screens (`FLAG_SECURE`)**: Banking apps, lock screens, and system permission dialogs block `AccessibilityService` inspection by Android OS design. Sifat Agent respects these boundaries and never attempts to bypass them.
- **Direct Call / Silent SMS**: Without `CALL_PHONE` / `SEND_SMS` restricted permissions (and Play Store policy approval), Sifat Agent intentionally uses `ACTION_DIAL` and `ACTION_SENDTO` intents so the user always sees and confirms the final recipient and message inside the native dialer/SMS app.
