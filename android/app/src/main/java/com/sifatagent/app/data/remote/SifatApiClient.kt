package com.sifatagent.app.data.remote

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.sifatagent.app.BuildConfig
import com.sifatagent.app.domain.model.ActionPlan
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

@Serializable
data class InterpretRequest(
    val prompt: String,
    val preferredLanguage: String,
    val screenSummary: String? = null,
    val installedAppNames: List<String> = emptyList()
)

@Serializable
data class InterpretResponse(
    val plan: ActionPlan,
    val modelUsed: String = "gemini-4-hydrogen"
)

@Serializable
data class SessionTokenResponse(
    val token: String,
    val expiresAtEpochMs: Long
)

interface SifatBackendApi {
    @POST("api/auth/session")
    suspend fun createSession(): SessionTokenResponse

    @POST("api/agent/interpret")
    suspend fun interpretCommand(
        @Header("Authorization") bearerToken: String,
        @Body request: InterpretRequest
    ): InterpretResponse
}

/**
 * HTTPS client communicating strictly with the Sifat Agent secure backend.
 * Gemini API keys never exist in the Android APK.
 * Ephemeral session tokens are stored in EncryptedSharedPreferences.
 */
class SifatApiClient(context: Context) {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private val encryptedPrefs by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "sifat_secure_credentials",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    private val okHttpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BASIC
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
            redactHeader("Authorization")
        }
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()
    }

    private val api: SifatBackendApi by lazy {
        val normalizedBase = if (BuildConfig.BACKEND_BASE_URL.endsWith("/")) {
            BuildConfig.BACKEND_BASE_URL
        } else {
            "${BuildConfig.BACKEND_BASE_URL}/"
        }
        Retrofit.Builder()
            .baseUrl(normalizedBase)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(SifatBackendApi::class.java)
    }

    suspend fun interpret(request: InterpretRequest): Result<InterpretResponse> = runCatching {
        val token = getOrRefreshSessionToken()
        api.interpretCommand("Bearer $token", request)
    }

    private suspend fun getOrRefreshSessionToken(): String {
        val cached = encryptedPrefs.getString(KEY_SESSION_TOKEN, null)
        val expiresAt = encryptedPrefs.getLong(KEY_TOKEN_EXPIRY, 0L)
        if (!cached.isNullOrBlank() && System.currentTimeMillis() < expiresAt - 30_000L) {
            return cached
        }
        val fresh = api.createSession()
        encryptedPrefs.edit()
            .putString(KEY_SESSION_TOKEN, fresh.token)
            .putLong(KEY_TOKEN_EXPIRY, fresh.expiresAtEpochMs)
            .apply()
        return fresh.token
    }

    companion object {
        private const val KEY_SESSION_TOKEN = "session_token"
        private const val KEY_TOKEN_EXPIRY = "session_expiry"
    }
}
