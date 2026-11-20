package com.sifatagent.app.domain.safety

import com.sifatagent.app.domain.model.ActionPlan
import com.sifatagent.app.domain.model.ActionStep
import com.sifatagent.app.domain.model.AllowedActionType
import com.sifatagent.app.domain.model.RiskLevel
import java.net.URI

data class ActionSpecification(
    val action: AllowedActionType,
    val permissionRequirement: String,
    val riskLevel: RiskLevel,
    val confirmationRequired: Boolean,
    val requiredParams: Set<String> = emptySet(),
    val optionalParams: Set<String> = emptySet()
)

data class ValidationOutcome(
    val isValid: Boolean,
    val validatedPlan: ActionPlan,
    val rejectionReason: String? = null
)

/**
 * Enforces an explicit allow-list on every AI-proposed phone action.
 * The AI cannot execute arbitrary intents, bypass security screens,
 * perform financial transfers, or send SMS/calls without user confirmation.
 */
object ActionValidator {

    private val allowedSettingsSections = setOf(
        "general", "wifi", "bluetooth", "display", "sound",
        "accessibility", "apps", "battery", "privacy", "locale"
    )

    private val blockedKeywords = listOf(
        "bypass lock", "unlock screen", "pin code", "banking transfer",
        "send money", "bkash send", "nagad transfer", "delete all files",
        "wipe data", "factory reset", "grant permission automatically",
        "root shell", "su -c", "adb shell", "rm -rf"
    )

    val registry: Map<AllowedActionType, ActionSpecification> = mapOf(
        AllowedActionType.CONVERSATION to ActionSpecification(
            action = AllowedActionType.CONVERSATION,
            permissionRequirement = "NONE",
            riskLevel = RiskLevel.LOW,
            confirmationRequired = false
        ),
        AllowedActionType.CLARIFY to ActionSpecification(
            action = AllowedActionType.CLARIFY,
            permissionRequirement = "NONE",
            riskLevel = RiskLevel.LOW,
            confirmationRequired = false
        ),
        AllowedActionType.LAUNCH_APP to ActionSpecification(
            action = AllowedActionType.LAUNCH_APP,
            permissionRequirement = "QUERY_PACKAGES",
            riskLevel = RiskLevel.LOW,
            confirmationRequired = false,
            requiredParams = setOf("appName")
        ),
        AllowedActionType.OPEN_SETTINGS to ActionSpecification(
            action = AllowedActionType.OPEN_SETTINGS,
            permissionRequirement = "NONE",
            riskLevel = RiskLevel.LOW,
            confirmationRequired = false,
            optionalParams = setOf("section")
        ),
        AllowedActionType.GO_HOME to ActionSpecification(
            action = AllowedActionType.GO_HOME,
            permissionRequirement = "ACCESSIBILITY_SERVICE",
            riskLevel = RiskLevel.LOW,
            confirmationRequired = false
        ),
        AllowedActionType.GO_BACK to ActionSpecification(
            action = AllowedActionType.GO_BACK,
            permissionRequirement = "ACCESSIBILITY_SERVICE",
            riskLevel = RiskLevel.LOW,
            confirmationRequired = false
        ),
        AllowedActionType.READ_SCREEN to ActionSpecification(
            action = AllowedActionType.READ_SCREEN,
            permissionRequirement = "ACCESSIBILITY_SERVICE",
            riskLevel = RiskLevel.MEDIUM,
            confirmationRequired = false
        ),
        AllowedActionType.CLICK_ELEMENT to ActionSpecification(
            action = AllowedActionType.CLICK_ELEMENT,
            permissionRequirement = "ACCESSIBILITY_SERVICE",
            riskLevel = RiskLevel.MEDIUM,
            confirmationRequired = false,
            requiredParams = setOf("targetLabel")
        ),
        AllowedActionType.SCROLL_SCREEN to ActionSpecification(
            action = AllowedActionType.SCROLL_SCREEN,
            permissionRequirement = "ACCESSIBILITY_SERVICE",
            riskLevel = RiskLevel.LOW,
            confirmationRequired = false,
            optionalParams = setOf("direction")
        ),
        AllowedActionType.OPEN_URL to ActionSpecification(
            action = AllowedActionType.OPEN_URL,
            permissionRequirement = "NONE",
            riskLevel = RiskLevel.MEDIUM,
            confirmationRequired = false,
            requiredParams = setOf("url")
        ),
        AllowedActionType.SET_BRIGHTNESS to ActionSpecification(
            action = AllowedActionType.SET_BRIGHTNESS,
            permissionRequirement = "WRITE_SETTINGS",
            riskLevel = RiskLevel.MEDIUM,
            confirmationRequired = true,
            requiredParams = setOf("levelPercent")
        ),
        AllowedActionType.DIAL_NUMBER to ActionSpecification(
            action = AllowedActionType.DIAL_NUMBER,
            permissionRequirement = "INTENT_DIAL_ONLY",
            riskLevel = RiskLevel.HIGH,
            confirmationRequired = true,
            requiredParams = setOf("phoneNumber"),
            optionalParams = setOf("contactName")
        ),
        AllowedActionType.COMPOSE_SMS to ActionSpecification(
            action = AllowedActionType.COMPOSE_SMS,
            permissionRequirement = "INTENT_SENDTO_ONLY",
            riskLevel = RiskLevel.HIGH,
            confirmationRequired = true,
            requiredParams = setOf("phoneNumber", "messageBody"),
            optionalParams = setOf("contactName")
        ),
        AllowedActionType.SHARE_CONTENT to ActionSpecification(
            action = AllowedActionType.SHARE_CONTENT,
            permissionRequirement = "INTENT_SEND",
            riskLevel = RiskLevel.HIGH,
            confirmationRequired = true,
            requiredParams = setOf("text")
        )
    )

    fun containsBlockedIntent(rawInput: String): Boolean {
        val lower = rawInput.lowercase()
        return blockedKeywords.any { lower.contains(it) }
    }

    fun validatePlan(plan: ActionPlan, rawUserPrompt: String = ""): ValidationOutcome {
        if (containsBlockedIntent(rawUserPrompt)) {
            return ValidationOutcome(
                isValid = false,
                validatedPlan = ActionPlan(
                    intentType = "blocked",
                    replyText = "For your security, Sifat Agent cannot bypass lock screens, permission dialogs, banking protections, or perform destructive actions.",
                    steps = emptyList()
                ),
                rejectionReason = "Blocked security-sensitive request"
            )
        }

        if (plan.steps.isEmpty()) {
            return ValidationOutcome(isValid = true, validatedPlan = plan)
        }

        val validatedSteps = mutableListOf<ActionStep>()
        for (step in plan.steps) {
            if (step.action == AllowedActionType.UNSUPPORTED_OR_BLOCKED) {
                return ValidationOutcome(
                    isValid = false,
                    validatedPlan = plan.copy(
                        intentType = "blocked",
                        steps = emptyList()
                    ),
                    rejectionReason = "Action is outside the allow-list"
                )
            }

            val spec = registry[step.action] ?: return ValidationOutcome(
                isValid = false,
                validatedPlan = plan.copy(intentType = "blocked", steps = emptyList()),
                rejectionReason = "Unknown action type: ${step.action}"
            )

            // Check required parameters
            for (req in spec.requiredParams) {
                if (step.parameters[req].isNullOrBlank()) {
                    return ValidationOutcome(
                        isValid = false,
                        validatedPlan = ActionPlan(
                            intentType = "clarification",
                            replyText = "I need a bit more detail before I can proceed (${req} is missing).",
                            clarifyingQuestion = "Please provide $req for ${step.action.name.lowercase().replace('_', ' ')}.",
                            steps = emptyList()
                        ),
                        rejectionReason = "Missing required parameter: $req"
                    )
                }
            }

            val sanitizedParams = sanitizeParameters(step.action, step.parameters)
                ?: return ValidationOutcome(
                    isValid = false,
                    validatedPlan = plan.copy(
                        intentType = "blocked",
                        replyText = "Invalid or unsafe parameters were rejected by action validation.",
                        steps = emptyList()
                    ),
                    rejectionReason = "Parameter validation failed for ${step.action}"
                )

            validatedSteps += step.copy(
                parameters = sanitizedParams,
                permissionRequirement = spec.permissionRequirement,
                riskLevel = spec.riskLevel,
                // Safety rule: server or model cannot downgrade a mandatory confirmation
                requiresConfirmation = spec.confirmationRequired || step.requiresConfirmation
            )
        }

        return ValidationOutcome(
            isValid = true,
            validatedPlan = plan.copy(steps = validatedSteps)
        )
    }

    private fun sanitizeParameters(
        action: AllowedActionType,
        params: Map<String, String>
    ): Map<String, String>? {
        val mutable = params.toMutableMap()
        return when (action) {
            AllowedActionType.OPEN_URL -> {
                val rawUrl = mutable["url"]?.trim() ?: return null
                val normalized = if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
                    rawUrl
                } else {
                    "https://$rawUrl"
                }
                val uri = runCatching { URI(normalized) }.getOrNull() ?: return null
                if (uri.scheme != "https" && uri.scheme != "http") return null
                if (uri.host.isNullOrBlank()) return null
                mutable["url"] = normalized
                mutable
            }

            AllowedActionType.SET_BRIGHTNESS -> {
                val level = mutable["levelPercent"]?.toIntOrNull() ?: return null
                if (level !in 5..100) return null
                mutable["levelPercent"] = level.toString()
                mutable
            }

            AllowedActionType.DIAL_NUMBER, AllowedActionType.COMPOSE_SMS -> {
                val phone = mutable["phoneNumber"]?.trim() ?: return null
                val cleaned = phone.filter { it.isDigit() || it == '+' }
                if (cleaned.length < 3 || cleaned.length > 20) return null
                mutable["phoneNumber"] = cleaned
                mutable
            }

            AllowedActionType.OPEN_SETTINGS -> {
                val section = mutable["section"]?.lowercase()?.trim() ?: "general"
                mutable["section"] = if (section in allowedSettingsSections) section else "general"
                mutable
            }

            AllowedActionType.SCROLL_SCREEN -> {
                val dir = mutable["direction"]?.lowercase()?.trim() ?: "down"
                mutable["direction"] = if (dir == "up" || dir == "down") dir else "down"
                mutable
            }

            else -> mutable
        }
    }
}
