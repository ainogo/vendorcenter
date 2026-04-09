plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.vendorcenter.vendorcenter"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.vendorcenter.vendorcenter"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    // Two product flavors: customer and vendor
    flavorDimensions += "app"
    productFlavors {
        create("customer") {
            dimension = "app"
            applicationId = "com.vendorcenter.customer"
            resValue("string", "app_name", "VendorCenter")
        }
        create("vendor") {
            dimension = "app"
            applicationId = "com.vendorcenter.vendor"
            resValue("string", "app_name", "VendorPortal")
        }
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
