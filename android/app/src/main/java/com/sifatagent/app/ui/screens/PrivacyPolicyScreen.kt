package com.sifatagent.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun PrivacyPolicyScreen(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Privacy & Security Policy", style = MaterialTheme.typography.headlineMedium)
        }

        PolicyBlock(
            heading = "1. Microphone & Voice Data",
            body = "Audio is processed through Android SpeechRecognizer only when you tap Talk or explicitly enable the Wake-Word Foreground Service, which always shows a persistent notification. No silent background recording occurs."
        )
        PolicyBlock(
            heading = "2. Accessibility & Screen Content",
            body = "SifatAccessibilityService reads visible UI elements strictly on user command. Password fields (isPassword) are automatically redacted and never stored or transmitted. Screen summaries are never persisted."
        )
        PolicyBlock(
            heading = "3. Network & Gemini Backend",
            body = "Commands are sent over HTTPS to the Sifat Agent proxy backend. Gemini API keys reside exclusively on the server and are never bundled inside the Android APK."
        )
        PolicyBlock(
            heading = "4. Sensitive Action Safeguards",
            body = "Calls, SMS drafts, sharing, and brightness changes require explicit confirmation and preview. Sifat Agent never bypasses lock screens, permission prompts, or banking security."
        )
        PolicyBlock(
            heading = "5. Local Data Control",
            body = "Chat messages and command history are stored locally via Room and can be deleted individually or cleared completely at any time."
        )
    }
}

@Composable
private fun PolicyBlock(heading: String, body: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(heading, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleLarge)
        Text(
            text = body,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
