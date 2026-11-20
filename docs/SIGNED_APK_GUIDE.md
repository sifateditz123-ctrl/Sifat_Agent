# Generating a Signed Release APK for Sifat Agent

`/android/app/build.gradle.kts` is preconfigured with ProGuard/R8 shrinking (`isMinifyEnabled = true`, `isShrinkResources = true`) and a `release` signing config that reads credentials from environment variables or `android/local.properties` (never committed to Git).

## Step 1: Generate an Upload Keystore

Run `keytool` from JDK 17:

```bash
keytool -genkeypair -v \
  -keystore sifat-release.jks \
  -alias sifat_release_key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Keep `sifat-release.jks` outside your Git repository.

## Step 2: Configure Signing Credentials

Option A — Environment variables (recommended for CI/CD):
```bash
export SIFAT_KEYSTORE_PATH="/absolute/path/to/sifat-release.jks"
export SIFAT_KEYSTORE_PASSWORD="your_store_password"
export SIFAT_KEY_ALIAS="sifat_release_key"
export SIFAT_KEY_PASSWORD="your_key_password"
```

Option B — `android/local.properties` (local workstation only):
```properties
release.keystore.path=/absolute/path/to/sifat-release.jks
release.keystore.password=your_store_password
release.key.alias=sifat_release_key
release.key.password=your_key_password
```

## Step 3: Set Production Backend URL

In `android/gradle.properties`, ensure `SIFAT_BACKEND_BASE_URL` points to your HTTPS production server:
```properties
SIFAT_BACKEND_BASE_URL=https://your-production-backend.run.app/
```

## Step 4: Build & Verify the Signed APK

```bash
cd android
./gradlew clean testDebugUnitTest assembleRelease
```

Output path:
`android/app/build/outputs/apk/release/app-release.apk`

Verify the APK signature with Android SDK `apksigner`:
```bash
apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
```
