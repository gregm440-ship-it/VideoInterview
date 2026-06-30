import type { ExpoConfig, ConfigContext } from "expo/config";

// All secrets come from the environment (.env / EAS secrets) — never hardcode.
// EXPO_PUBLIC_* vars are also readable at runtime via process.env in app code.
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Rep & Sip",
  slug: "rep-and-sip",
  scheme: "repandsip",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  backgroundColor: "#F7F5F0",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#F7F5F0",
  },
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "io.emep.repandsip",
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Rep & Sip uses your location to find hotels near you.",
    },
    config: {
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    package: "io.emep.repandsip",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#E0A92E",
    },
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    config: {
      googleMaps: {
        apiKey: GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-apple-authentication",
    "expo-secure-store",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Rep & Sip uses your location to find hotels near you.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Rep & Sip needs access to your photos so you can add gym and bar shots to a review.",
        cameraPermission:
          "Rep & Sip needs camera access so you can snap gym and bar photos for a review.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
