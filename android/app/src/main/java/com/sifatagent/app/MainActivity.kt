package com.sifatagent.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sifatagent.app.ui.navigation.SifatNavGraph
import com.sifatagent.app.ui.theme.SifatAgentTheme
import com.sifatagent.app.ui.viewmodel.SifatViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val viewModel: SifatViewModel = viewModel()
            val settings by viewModel.settings.collectAsState()
            SifatAgentTheme(themePreference = settings.themePreference) {
                SifatNavGraph(viewModel = viewModel)
            }
        }
    }
}
