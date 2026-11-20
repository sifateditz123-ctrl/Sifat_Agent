package com.sifatagent.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sifatagent.app.domain.model.VoiceStage
import com.sifatagent.app.ui.components.AiOrb
import com.sifatagent.app.ui.theme.DeepNavyBg
import com.sifatagent.app.ui.theme.ElectricBlue
import com.sifatagent.app.ui.theme.ElectricViolet
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onFinished: () -> Unit) {
    LaunchedEffect(Unit) {
        delay(1400)
        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(DeepNavyBg, ElectricBlue.copy(alpha = 0.14f), DeepNavyBg)
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            AiOrb(stage = VoiceStage.IDLE, micLevel = 0f, size = 148.dp)
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Sifat Agent",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "বাংলা & English AI Assistant",
                style = MaterialTheme.typography.bodyMedium,
                color = ElectricViolet
            )
        }
    }
}
