package com.sifatagent.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.sifatagent.app.domain.model.VoiceStage
import com.sifatagent.app.ui.theme.ElectricBlue
import com.sifatagent.app.ui.theme.ElectricViolet
import com.sifatagent.app.ui.theme.SoftCyan
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun AiOrb(
    stage: VoiceStage,
    micLevel: Float,
    modifier: Modifier = Modifier,
    size: Dp = 188.dp
) {
    val infiniteTransition = rememberInfiniteTransition(label = "orb_transition")
    val phase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2f * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 3200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "orb_phase"
    )
    val pulse by infiniteTransition.animateFloat(
        initialValue = 0.94f,
        targetValue = 1.06f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1500),
            repeatMode = RepeatMode.Reverse
        ),
        label = "orb_pulse"
    )

    val reactivity = when (stage) {
        VoiceStage.LISTENING -> 1f + micLevel * 0.25f
        VoiceStage.PROCESSING -> 1.08f
        VoiceStage.SPEAKING -> 1.05f
        else -> 1f
    }

    Canvas(modifier = modifier.size(size)) {
        val center = Offset(this.size.width / 2f, this.size.height / 2f)
        val baseRadius = (this.size.minDimension / 2f) * 0.62f * pulse * reactivity

        // Outer ambient halo
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    ElectricBlue.copy(alpha = 0.28f),
                    ElectricViolet.copy(alpha = 0.14f),
                    Color.Transparent
                ),
                center = center,
                radius = baseRadius * 1.65f
            ),
            radius = baseRadius * 1.65f,
            center = center
        )

        // Orbital ring
        val ringOffset = Offset(
            center.x + cos(phase) * 4f,
            center.y + sin(phase) * 4f
        )
        drawCircle(
            brush = Brush.sweepGradient(
                colors = listOf(ElectricBlue, ElectricViolet, SoftCyan, ElectricBlue),
                center = ringOffset
            ),
            radius = baseRadius * 1.16f,
            center = ringOffset,
            style = Stroke(width = 3.dp.toPx())
        )

        // Core sphere
        drawCircle(
            brush = Brush.linearGradient(
                colors = listOf(ElectricBlue, ElectricViolet),
                start = Offset(center.x - baseRadius, center.y - baseRadius),
                end = Offset(center.x + baseRadius, center.y + baseRadius)
            ),
            radius = baseRadius,
            center = center
        )
    }
}

@Composable
fun MicrophoneWaveform(
    isActive: Boolean,
    micLevel: Float,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "wave_transition")
    val wavePhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2f * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "wave_phase"
    )

    Row(
        modifier = modifier.height(40.dp),
        horizontalArrangement = Arrangement.spacedBy(5.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val bars = 12
        for (i in 0 until bars) {
            val amplitude = if (isActive) {
                val wave = (sin(wavePhase + i * 0.55f) + 1f) / 2f
                (0.22f + wave * (0.4f + micLevel * 0.38f)).coerceIn(0.18f, 1f)
            } else {
                0.15f
            }
            Canvas(
                modifier = Modifier
                    .width(5.dp)
                    .height(36.dp)
            ) {
                val barHeight = size.height * amplitude
                val top = (size.height - barHeight) / 2f
                drawRoundRect(
                    brush = Brush.verticalGradient(listOf(SoftCyan, ElectricViolet)),
                    topLeft = Offset(0f, top),
                    size = Size(size.width, barHeight),
                    cornerRadius = CornerRadius(3.dp.toPx(), 3.dp.toPx())
                )
            }
        }
    }
}
