import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/auth";

export default function IndexScreen() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      if (user.role === "FIELD_WORKER") {
        router.replace("/(worker)/tasks");
      } else {
        router.replace("/(citizen)/home");
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Image
          source={require("../assets/logo-bluewaste.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image
          source={require("../assets/logo-bluewaste.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>
          Smart Waste Management{"\n"}for Panabo City
        </Text>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.primaryBtnText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/(auth)/register")}
        >
          <Text style={styles.secondaryBtnText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "space-between",
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  hero: { flex: 1, justifyContent: "center", alignItems: "center" },
  logoImage: { width: 160, height: 160, marginBottom: 12 },
  tagline: {
    fontSize: 18,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 26,
  },
  subtitle: { fontSize: 14, color: "#94a3b8", marginTop: 8 },
  buttons: { gap: 12, paddingBottom: 32 },
  primaryBtn: {
    backgroundColor: "#1d4ed8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: "#1d4ed8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#1d4ed8", fontSize: 16, fontWeight: "700" },
});
