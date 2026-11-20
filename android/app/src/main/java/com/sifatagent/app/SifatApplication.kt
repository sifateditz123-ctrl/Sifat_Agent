package com.sifatagent.app

import android.app.Application
import com.sifatagent.app.data.local.SettingsRepository
import com.sifatagent.app.data.local.SifatDatabase
import com.sifatagent.app.data.remote.SifatApiClient

class SifatApplication : Application() {
    val database by lazy { SifatDatabase.getInstance(this) }
    val settingsRepository by lazy { SettingsRepository(this) }
    val apiClient by lazy { SifatApiClient(this) }
}
