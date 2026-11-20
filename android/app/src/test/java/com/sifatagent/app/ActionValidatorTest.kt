package com.sifatagent.app.domain.safety

import com.sifatagent.app.domain.model.ActionPlan
import com.sifatagent.app.domain.model.ActionStep
import com.sifatagent.app.domain.model.AllowedActionType
import com.sifatagent.app.domain.model.RiskLevel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ActionValidatorTest {

    @Test
    fun `blocks lock screen bypass and financial auto execution prompts`() {
        val plan = ActionPlan(
            intentType = "phone_control",
            replyText = "Attempting...",
            steps = listOf(ActionStep("1", AllowedActionType.GO_HOME))
        )
        val result = ActionValidator.validatePlan(plan, "please bypass lock screen and send money")
        assertFalse(result.isValid)
        assertEquals("blocked", result.validatedPlan.intentType)
        assertTrue(result.validatedPlan.steps.isEmpty())
    }

    @Test
    fun `enforces confirmation on compose sms even if model sets false`() {
        val plan = ActionPlan(
            intentType = "phone_control",
            replyText = "Drafting SMS",
            steps = listOf(
                ActionStep(
                    stepId = "s1",
                    action = AllowedActionType.COMPOSE_SMS,
                    parameters = mapOf(
                        "phoneNumber" to "+880-1711-000000",
                        "messageBody" to "Hello from Sifat Agent"
                    ),
                    riskLevel = RiskLevel.LOW,
                    requiresConfirmation = false
                )
            )
        )
        val result = ActionValidator.validatePlan(plan, "send sms")
        assertTrue(result.isValid)
        val step = result.validatedPlan.steps.first()
        assertTrue(step.requiresConfirmation)
        assertEquals(RiskLevel.HIGH, step.riskLevel)
        assertEquals("+8801711000000", step.parameters["phoneNumber"])
    }

    @Test
    fun `rejects invalid url schemes such as javascript or file`() {
        val plan = ActionPlan(
            intentType = "phone_control",
            replyText = "Opening",
            steps = listOf(
                ActionStep(
                    stepId = "u1",
                    action = AllowedActionType.OPEN_URL,
                    parameters = mapOf("url" to "javascript:alert(1)")
                )
            )
        )
        val result = ActionValidator.validatePlan(plan, "open url")
        assertFalse(result.isValid)
        assertEquals("blocked", result.validatedPlan.intentType)
    }

    @Test
    fun `requests clarification when required parameter is missing`() {
        val plan = ActionPlan(
            intentType = "phone_control",
            replyText = "Launching",
            steps = listOf(
                ActionStep(
                    stepId = "a1",
                    action = AllowedActionType.LAUNCH_APP,
                    parameters = emptyMap()
                )
            )
        )
        val result = ActionValidator.validatePlan(plan, "open app")
        assertFalse(result.isValid)
        assertEquals("clarification", result.validatedPlan.intentType)
    }
}
