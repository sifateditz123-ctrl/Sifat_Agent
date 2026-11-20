package com.sifatagent.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.sifatagent.app.domain.model.VoiceStage
import com.sifatagent.app.ui.components.AiOrb
import com.sifatagent.app.ui.components.MicrophoneWaveform
import com.sifatagent.app.ui.theme.SemanticDanger
import com.sifatagent.app.ui.viewmodel.SifatViewModel

@Composable
fun VoiceAssistantScreen(
    viewModel: SifatViewModel,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val settings by viewModel.settings.collectAsState()

    val stageLabel = when (uiState.voiceStage) {
        VoiceStage.IDLE -> "Ready"
        VoiceStage.LISTENING -> "Listening (${settings.language.displayName})..."
        VoiceStage.PROCESSING -> "Thinking with Gemini..."
        VoiceStage.SPEAKING -> "Speaking response..."
        VoiceStage.ERROR -> "Speech Input Issue"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Text(
                text = "Voice Assistant",
                style = MaterialTheme.typography.titleLarge
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        AiOrb(
            stage = uiState.voiceStage,
            micLevel = uiState.micLevel,
            size = 216.dp
        )

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = stageLabel,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(10.dp))

        MicrophoneWaveform(
            isActive = uiState.voiceStage == VoiceStage.LISTENING || uiState.voiceStage == VoiceStage.SPEAKING,
            micLevel = uiState.micLevel
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = uiState.liveTranscript.ifBlank {
                uiState.statusNote ?: "Tap Start Listening and speak naturally."
            },
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = if (uiState.voiceStage == VoiceStage.ERROR) SemanticDanger else MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.weight(1f))

        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (uiState.voiceStage == VoiceStage.LISTENING) {
                Button(
                    onClick = { viewModel.stopVoiceListening() },
                    colors = ButtonDefaults.buttonColors(containerColor = SemanticDanger)
                ) {
                    Icon(Icons.Default.Stop, contentDescription = null)
                    Text(" Stop Listening")
                }
            } else {
                Button(onClick = { viewModel.startVoiceListening() }) {
                    Icon(Icons.Default.Mic, contentDescription = null)
                    Text(" Start Listening")
                }
            }

            if (uiState.voiceStage == VoiceStage.SPEAKING) {
                OutlinedButton(onClick = { viewModel.stopSpeaking() }) {
                    Text("Mute Speech")
                }
            }
        }
    }
}
