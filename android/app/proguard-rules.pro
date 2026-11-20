# Keep kotlinx.serialization models
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class com.sifatagent.app.domain.model.**$$serializer { *; }
-keepclassmembers class com.sifatagent.app.domain.model.** { *** Companion; }
-keepclasseswithmembers class com.sifatagent.app.domain.model.** { kotlinx.serialization.KSerializer serializer(...); }

# Keep Retrofit interfaces
-keepattributes Signature, Exceptions
-keep class com.sifatagent.app.data.remote.** { *; }
