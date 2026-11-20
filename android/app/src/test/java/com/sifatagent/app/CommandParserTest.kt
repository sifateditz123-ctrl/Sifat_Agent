package com.sifatagent.app.domain.safety

import com.sifatagent.app.domain.model.AllowedActionType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class CommandParserTest {

    @Test
    fun `parses bangla home screen command deterministically`() {
        val plan = CommandParser.tryLocalDeterministicParse("হোম স্ক্রিনে যাও")
        assertNotNull(plan)
        assertEquals("phone_control", plan!!.intentType)
        assertEquals(AllowedActionType.GO_HOME, plan.steps.first().action)
    }

    @Test
    fun `parses english read screen command deterministically`() {
        val plan = CommandParser.tryLocalDeterministicParse("read screen")
        assertNotNull(plan)
        assertEquals(AllowedActionType.READ_SCREEN, plan!!.steps.first().action)
    }

    @Test
    fun `returns null for general conversation so backend gemini handles it`() {
        val plan = CommandParser.tryLocalDeterministicParse("Explain photosynthesis in Bangla")
        assertNull(plan)
    }

    @Test
    fun `deserializes backend action plan json cleanly`() {
        val raw = """
            {
              "intentType": "phone_control",
              "replyText": "Opening Wi-Fi settings.",
              "replyLanguage": "en",
              "steps": [
                {
                  "stepId": "1",
                  "action": "OPEN_SETTINGS",
                  "parameters": { "section": "wifi" },
                  "description": "Open Wi-Fi Settings",
                  "permissionRequirement": "NONE",
                  "riskLevel": "LOW",
                  "requiresConfirmation": false
                }
              ]
            }
        """.trimIndent()
        val parsed = CommandParser.parseBackendJson(raw).getOrThrow()
        assertEquals(AllowedActionType.OPEN_SETTINGS, parsed.steps.first().action)
        assertEquals("wifi", parsed.steps.first().parameters["section"])
    }
}
