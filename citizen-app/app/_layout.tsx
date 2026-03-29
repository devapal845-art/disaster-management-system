import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";

export default function Layout() {

  const router = useRouter();
  const segments = useSegments();

  const [checkingAuth, setCheckingAuth] = useState(true);

/* ================= AUTH CHECK ================= */

  useEffect(() => {

    const checkAuth = async () => {
      try {

        const token = await AsyncStorage.getItem("token");
        const role = await AsyncStorage.getItem("role");

        const currentRoute = segments?.[0];

        console.log("ROUTE:", currentRoute);
        console.log("TOKEN:", token ? "EXISTS ✅" : "MISSING ❌");

        /* ================= NO TOKEN ================= */

        if (!token) {

          if (currentRoute !== "login" && currentRoute !== "register") {
            router.replace("/login");
          }

        }

        /* ================= HAS TOKEN ================= */

        else {

          // Redirect ONLY if user is on login/register
          if (currentRoute === "login" || currentRoute === "register") {

            const roleUpper = role?.toUpperCase();

            if (roleUpper === "CITIZEN") {
              router.replace("/(citizen-tabs)/home");
            }

            else if (roleUpper === "NGO_ADMIN") {
              router.replace("/ngo/ngo-center-dashboard");
            }

            else if (roleUpper === "NGO_USER") {
              router.replace("/ngo/ngo-user-dashboard");
            }

            else if (roleUpper === "GOV_ADMIN") {
              router.replace("/government/central-dashboard");
            }

            else if (roleUpper === "GOV_EMPLOYEE") {
              router.replace("/government/employee-dashboard");
            }

            else if (roleUpper === "ADMIN") {
              router.replace("/admin/dashboard");
            }

          }

        }

      } catch (err: any) {

        console.log("Auth error:", err?.message);
        router.replace("/login");

      } finally {
        setCheckingAuth(false);
      }
    };

    // ✅ ONLY run when segments ready
    if (segments.length > 0) {
      checkAuth();
    }

  }, [segments]);

/* ================= LOADING ================= */

  if (checkingAuth) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0f172a"
        }}
      >
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

/* ================= MAIN ================= */

  return <Stack screenOptions={{ headerShown: false }} />;
}