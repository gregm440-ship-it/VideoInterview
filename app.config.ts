import type { ExpoConfig, ConfigContext } from "expo/config";

// All secrets come from the environment (.env / EAS secrets) — never hardcode.
// EXPO_PUBLIC_* vars are also readable at runtime via process.env in app code.
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Bench & Bar",
  slug: "bench-and-bar",
  scheme: "benchandbar",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  backgroundColor: "#EEF4FA",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#EEF4FA",
  },
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "travel.benchandbar.app",
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Bench & Bar uses your location to find hotels near you.",
    },
    config: {
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    package: "travel.benchandbar.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#10233F",
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
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Bench & Bar uses your location to find hotels near you.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Bench & Bar needs access to your photos so you can add gym and bar shots to a review.",
        cameraPermission:
          "Bench & Bar needs camera access so you can snap gym and bar photos for a review.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
