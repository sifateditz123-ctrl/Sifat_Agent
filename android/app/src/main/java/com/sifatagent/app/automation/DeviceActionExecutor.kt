package com.sifatagent.app.automation

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import com.sifatagent.app.domain.model.ActionStep
import com.sifatagent.app.domain.model.AllowedActionType
import com.sifatagent.app.domain.model.ExecutionResult
import com.sifatagent.app.domain.model.ScreenContextSnapshot

class DeviceActionExecutor(private val context: Context) {

    fun executeStep(
        step: ActionStep,
        automationMasterSwitch: Boolean,
        onScreenSnapshotCaptured: (ScreenContextSnapshot) -> Unit = {}
    ): ExecutionResult {
        return when (step.action) {
            AllowedActionType.CONVERSATION, AllowedActionType.CLARIFY -> ExecutionResult(
                stepId = step.stepId,
                action = step.action,
                success = true,
                message = "Handled conversationally."
            )

            AllowedActionType.LAUNCH_APP -> launchInstalledApp(step)
            AllowedActionType.OPEN_SETTINGS -> openSettingsPage(step)
            AllowedActionType.OPEN_URL -> openUrlIntent(step)
            AllowedActionType.SET_BRIGHTNESS -> adjustBrightness(step)
            AllowedActionType.DIAL_NUMBER -> openDialerIntent(step)
            AllowedActionType.COMPOSE_SMS -> openSmsComposerIntent(step)
            AllowedActionType.SHARE_CONTENT -> openShareSheetIntent(step)

            AllowedActionType.GO_HOME -> requireAccessibility(step, automationMasterSwitch) { service ->
                if (service.performGoHome()) {
                    ExecutionResult(step.stepId, step.action, true, "Navigated to Home screen.")
                } else {
                    ExecutionResult(step.stepId, step.action, false, "Could not perform Home action.")
                }
            }

            AllowedActionType.GO_BACK -> requireAccessibility(step, automationMasterSwitch) { service ->
                if (service.performGoBack()) {
                    ExecutionResult(step.stepId, step.action, true, "Navigated Back.")
                } else {
                    ExecutionResult(step.stepId, step.action, false, "Could not perform Back action.")
                }
            }

            AllowedActionType.READ_SCREEN -> requireAccessibility(step, automationMasterSwitch) { service ->
                val snapshot = service.readVisibleScreenSnapshot()
                if (snapshot != null) {
                    onScreenSnapshotCaptured(snapshot)
                    val preview = snapshot.visibleTextLines.take(6).joinToString(" | ")
                    ExecutionResult(
                        step.stepId,
                        step.action,
                        true,
                        "Read ${snapshot.visibleTextLines.size} visible text lines (${snapshot.redactedSensitiveFieldsCount} sensitive fields redacted): $preview"
                    )
                } else {
                    ExecutionResult(step.stepId, step.action, false, "Active window is unavailable or protected.")
                }
            }

            AllowedActionType.CLICK_ELEMENT -> requireAccessibility(step, automationMasterSwitch) { service ->
                val label = step.parameters["targetLabel"].orEmpty()
                if (service.clickVisibleElementByLabel(label)) {
                    ExecutionResult(step.stepId, step.action, true, "Tapped '$label'.")
                } else {
                    ExecutionResult(step.stepId, step.action, false, "Visible accessible element '$label' not found.")
                }
            }

            AllowedActionType.SCROLL_SCREEN -> requireAccessibility(step, automationMasterSwitch) { service ->
                val dir = step.parameters["direction"] ?: "down"
                if (service.scrollVisibleContent(dir)) {
                    ExecutionResult(step.stepId, step.action, true, "Scrolled $dir.")
                } else {
                    ExecutionResult(step.stepId, step.action, false, "No scrollable container found on screen.")
                }
            }

            AllowedActionType.UNSUPPORTED_OR_BLOCKED -> ExecutionResult(
                stepId = step.stepId,
                action = step.action,
                success = false,
                message = "Action is blocked or unsupported."
            )
        }
    }

    private inline fun requireAccessibility(
        step: ActionStep,
        masterSwitch: Boolean,
        block: (SifatAccessibilityService) -> ExecutionResult
    ): ExecutionResult {
        if (!masterSwitch) {
            return ExecutionResult(
                stepId = step.stepId,
                action = step.action,
                success = false,
                message = "Automation master switch is disabled in Settings."
            )
        }
        val service = SifatAccessibilityService.getInstance()
            ?: return ExecutionResult(
                stepId = step.stepId,
                action = step.action,
                success = false,
                message = "Sifat Accessibility Service is not enabled in Android Settings."
            )
        return block(service)
    }

    private fun launchInstalledApp(step: ActionStep): ExecutionResult {
        val requested = step.parameters["appName"].orEmpty().trim()
        val pm = context.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = pm.queryIntentActivities(mainIntent, PackageManager.MATCH_ALL)

        val match = apps.firstOrNull { info ->
            val label = info.loadLabel(pm).toString()
            val pkg = info.activityInfo.packageName
            label.equals(requested, ignoreCase = true) ||
                label.contains(requested, ignoreCase = true) ||
                pkg.equals(requested, ignoreCase = true)
        }

        if (match == null) {
            return ExecutionResult(
                stepId = step.stepId,
                action = step.action,
                success = false,
                message = "App '$requested' is not installed on this device."
            )
        }

        val launchIntent = pm.getLaunchIntentForPackage(match.activityInfo.packageName)
            ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ?: return ExecutionResult(
                stepId = step.stepId,
                action = step.action,
                success = false,
                message = "Cannot create launch intent for '$requested'."
            )

        context.startActivity(launchIntent)
        val resolvedName = match.loadLabel(pm).toString()
        return ExecutionResult(step.stepId, step.action, true, "Launched $resolvedName.")
    }

    private fun openSettingsPage(step: ActionStep): ExecutionResult {
        val section = step.parameters["section"]?.lowercase() ?: "general"
        val action = when (section) {
            "wifi" -> Settings.ACTION_WIFI_SETTINGS
            "bluetooth" -> Settings.ACTION_BLUETOOTH_SETTINGS
            "display" -> Settings.ACTION_DISPLAY_SETTINGS
            "sound" -> Settings.ACTION_SOUND_SETTINGS
            "accessibility" -> Settings.ACTION_ACCESSIBILITY_SETTINGS
            "apps" -> Settings.ACTION_APPLICATION_SETTINGS
            "battery" -> Settings.ACTION_BATTERY_SAVER_SETTINGS
            "privacy" -> Settings.ACTION_PRIVACY_SETTINGS
            "locale" -> Settings.ACTION_LOCALE_SETTINGS
            else -> Settings.ACTION_SETTINGS
        }
        val intent = Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return ExecutionResult(step.stepId, step.action, true, "Opened Android $section settings.")
    }

    private fun openUrlIntent(step: ActionStep): ExecutionResult {
        val url = step.parameters["url"].orEmpty()
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return runCatching {
            context.startActivity(intent)
            ExecutionResult(step.stepId, step.action, true, "Opened URL: $url")
        }.getOrElse {
            ExecutionResult(step.stepId, step.action, false, "No browser available to open URL.")
        }
    }

    private fun adjustBrightness(step: ActionStep): ExecutionResult {
        if (!Settings.System.canWrite(context)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_WRITE_SETTINGS,
                Uri.parse("package:${context.packageName}")
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            return ExecutionResult(
                stepId = step.stepId,
                action = step.action,
                success = false,
                message = "Modify System Settings permission is required. Opened permission page."
            )
        }
        val percent = step.parameters["levelPercent"]?.toIntOrNull()?.coerceIn(5, 100) ?: 50
        val value255 = (percent * 255) / 100
        Settings.System.putInt(
            context.contentResolver,
            Settings.System.SCREEN_BRIGHTNESS_MODE,
            Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
        )
        Settings.System.putInt(
            context.contentResolver,
            Settings.System.SCREEN_BRIGHTNESS,
            value255
        )
        return ExecutionResult(step.stepId, step.action, true, "Set screen brightness to $percent%.")
    }

    private fun openDialerIntent(step: ActionStep): ExecutionResult {
        val phone = step.parameters["phoneNumber"].orEmpty()
        // Always uses ACTION_DIAL (opens pre-filled dialer) rather than silent ACTION_CALL.
        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return ExecutionResult(step.stepId, step.action, true, "Opened dialer preview for $phone.")
    }

    private fun openSmsComposerIntent(step: ActionStep): ExecutionResult {
        val phone = step.parameters["phoneNumber"].orEmpty()
        val body = step.parameters["messageBody"].orEmpty()
        // Always uses ACTION_SENDTO so the user reviews & taps Send inside their SMS app.
        val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:$phone")).apply {
            putExtra("sms_body", body)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        return ExecutionResult(step.stepId, step.action, true, "Opened SMS draft to $phone.")
    }

    private fun openShareSheetIntent(step: ActionStep): ExecutionResult {
        val text = step.parameters["text"].orEmpty()
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
        val chooser = Intent.createChooser(shareIntent, "Share via Sifat Agent")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(chooser)
        return ExecutionResult(step.stepId, step.action, true, "Opened Android share sheet.")
    }
}
