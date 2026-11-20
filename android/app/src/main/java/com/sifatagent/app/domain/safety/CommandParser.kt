package com.sifatagent.app.domain.safety

import com.sifatagent.app.domain.model.ActionPlan
import com.sifatagent.app.domain.model.ActionStep
import com.sifatagent.app.domain.model.AllowedActionType
import com.sifatagent.app.domain.model.RiskLevel
import kotlinx.serialization.json.Json
import java.util.UUID

/**
 * Parses backend JSON ActionPlans and provides deterministic bilingual
 * local command parsing for safe offline/quick phone controls.
 */
object CommandParser {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    fun parseBackendJson(rawJson: String): Result<ActionPlan> = runCatching {
        json.decodeFromString(ActionPlan.serializer(), rawJson)
    }

    /**
     * Deterministic local parser for immediate offline navigation / safety checks.
     * Returns null when the input requires Gemini NLU on the backend.
     */
    fun tryLocalDeterministicParse(input: String): ActionPlan? {
        val trimmed = input.trim()
        val lower = trimmed.lowercase()

        if (ActionValidator.containsBlockedIntent(lower)) {
            return ActionPlan(
                intentType = "blocked",
                replyText = "This operation is blocked by Sifat Agent's security policy.",
                steps = emptyList()
            )
        }

        return when {
            lower == "go home" || lower == "home screen" || trimmed.contains("হোম স্ক্রিনে যাও") -> {
                ActionPlan(
                    intentType = "phone_control",
                    replyText = "Navigating to the Home screen.",
                    steps = listOf(
                        ActionStep(
                            stepId = UUID.randomUUID().toString(),
                            action = AllowedActionType.GO_HOME,
                            description = "Return to Android Home screen",
                            permissionRequirement = "ACCESSIBILITY_SERVICE",
                            riskLevel = RiskLevel.LOW,
                            requiresConfirmation = false
                        )
                    )
                )
            }

            lower == "go back" || lower == "back" || trimmed.contains("পেছনে যাও") -> {
                ActionPlan(
                    intentType = "phone_control",
                    replyText = "Performing Back navigation.",
                    steps = listOf(
                        ActionStep(
                            stepId = UUID.randomUUID().toString(),
                            action = AllowedActionType.GO_BACK,
                            description = "Navigate Back",
                            permissionRequirement = "ACCESSIBILITY_SERVICE",
                            riskLevel = RiskLevel.LOW,
                            requiresConfirmation = false
                        )
                    )
                )
            }

            lower == "read screen" || lower == "what is on my screen" || trimmed.contains("স্ক্রিন পড়ো") -> {
                ActionPlan(
                    intentType = "phone_control",
                    replyText = "Reading visible screen content via Accessibility Service.",
                    steps = listOf(
                        ActionStep(
                            stepId = UUID.randomUUID().toString(),
                            action = AllowedActionType.READ_SCREEN,
                            description = "Read accessible text on active screen",
                            permissionRequirement = "ACCESSIBILITY_SERVICE",
                            riskLevel = RiskLevel.MEDIUM,
                            requiresConfirmation = false
                        )
                    )
                )
            }

            else -> null
        }
    }
}
