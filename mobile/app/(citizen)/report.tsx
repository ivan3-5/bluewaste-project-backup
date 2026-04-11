import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import api, { getStoredAuthToken } from "../../lib/api";
import { getApiErrorMessage } from "../../lib/apiError";
import { WASTE_CATEGORY_LABELS, WasteCategory } from "../../types";

const categories = Object.entries(WASTE_CATEGORY_LABELS) as [
  WasteCategory,
  string,
][];

const YOLO_API_URL =
  (globalThis as any)?.process?.env?.EXPO_PUBLIC_YOLO_API_URL ||
  "http://localhost:8000/predict";

type DetectionStatus = "DIRTY" | "CLEAN";

function toNonNegativeInt(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return fallback;
}

function normalizeDecisionStatus(value: unknown): DetectionStatus {
  if (typeof value !== "string") {
    return "CLEAN";
  }

  return value.trim().toUpperCase() === "DIRTY" ? "DIRTY" : "CLEAN";
}

export default function ReportScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WasteCategory | "">("");
  const [address, setAddress] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<DetectionStatus | null>(
    null,
  );
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const analyzeWasteImage = async (image: ImagePicker.ImagePickerAsset) => {
    const token = await getStoredAuthToken();
    const formData = new FormData();
    formData.append("image", {
      uri: image.uri,
      type: image.mimeType || "image/jpeg",
      name: image.fileName || "report.jpg",
    } as any);

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(YOLO_API_URL, {
      method: "POST",
      headers,
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        payload?.detail || payload?.message || "Failed to analyze image";
      throw new Error(message);
    }

    const status = normalizeDecisionStatus(payload?.status);
    const wasteCount = toNonNegativeInt(payload?.waste_count);
    const count = toNonNegativeInt(
      payload?.count,
      Array.isArray(payload?.detections) ? payload.detections.length : 0,
    );

    return { status, wasteCount, count };
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required");
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      // Fallback to Panabo City center
      setLocation({ lat: 7.3132, lng: 125.6844 });
      Alert.alert(
        "Note",
        "Could not get exact location. Using Panabo City center.",
      );
    }
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets].slice(0, 5));
      setAnalysisStatus(null);
      setAnalysisMessage("");
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera permission is required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && images.length < 5) {
      setImages((prev) => [...prev, ...result.assets].slice(0, 5));
      setAnalysisStatus(null);
      setAnalysisMessage("");
    }
  };

  const handleSubmit = async () => {
    if (!title || title.length < 5)
      return Alert.alert("Error", "Title must be at least 5 characters");
    if (!description || description.length < 20)
      return Alert.alert("Error", "Description must be at least 20 characters");
    if (!category) return Alert.alert("Error", "Please select a category");
    if (!location) return Alert.alert("Error", "Please set your location");

    setLoading(true);
    setAnalysisMessage("");
    setAnalysisStatus(null);
    try {
      const { data: report } = await api.post("/reports", {
        title: title.trim(),
        description: description.trim(),
        category,
        latitude: location.lat,
        longitude: location.lng,
        address: address.trim() || undefined,
        isAnonymous,
      });

      if (images.length > 0 && report?.id) {
        const formData = new FormData();
        images.forEach((img, i) => {
          formData.append("images", {
            uri: img.uri,
            type: "image/jpeg",
            name: `photo_${i}.jpg`,
          } as any);
        });
        formData.append("type", "REPORT");
        await api.post(`/reports/${report.id}/images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      Alert.alert("Success", "Report submitted successfully!", [
        { text: "OK", onPress: () => router.push("/(citizen)/my-reports") },
      ]);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        Alert.alert(
          "Login Required",
          "Your session has expired. Please sign in again to submit reports.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }],
        );
      } else {
        Alert.alert(
          "Error",
          err instanceof Error
            ? err.message
            : getApiErrorMessage(err, "Failed to submit report"),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Submit Waste Report</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief description"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: "top" }]}
          placeholder="Detailed information..."
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1000}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Category *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 6 }}
        >
          {categories.map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, category === key && styles.chipSelected]}
              onPress={() => setCategory(key)}
            >
              <Text
                style={[
                  styles.chipText,
                  category === key && styles.chipTextSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Address / Landmark</Text>
        <TextInput
          style={styles.input}
          placeholder="Nearby landmark"
          value={address}
          onChangeText={setAddress}
        />
      </View>

      {/* Location */}
      <View style={styles.field}>
        <Text style={styles.label}>Location *</Text>
        {location ? (
          <View style={styles.locationSet}>
            <Text style={styles.locationText}>
              📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </Text>
            <TouchableOpacity onPress={getLocation}>
              <Text style={styles.linkText}>Update</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.locationBtn} onPress={getLocation}>
            <Text style={styles.locationBtnText}>📍 Get My Location</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Photos */}
      <View style={styles.field}>
        <Text style={styles.label}>Photos ({images.length}/5)</Text>
        <View style={styles.photoActions}>
          {images.length < 5 && (
            <>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Text style={styles.photoBtnText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
                <Text style={styles.photoBtnText}>🖼️ Gallery</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {images.length > 0 && (
          <ScrollView horizontal style={{ marginTop: 8 }}>
            {images.map((img, i) => (
              <View key={i} style={styles.imagePreview}>
                <Image source={{ uri: img.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => {
                    setImages((prev) => prev.filter((_, idx) => idx !== i));
                    setAnalysisStatus(null);
                    setAnalysisMessage("");
                  }}
                >
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        {analysisMessage ? (
          <Text
            style={[
              styles.analysisText,
              analysisStatus === "DIRTY"
                ? styles.analysisTextDirty
                : styles.analysisTextClean,
            ]}
          >
            {analysisMessage}
          </Text>
        ) : null}
      </View>

      {/* Anonymous */}
      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => setIsAnonymous(!isAnonymous)}
      >
        <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
          {isAnonymous && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkLabel}>Submit anonymously</Text>
      </TouchableOpacity>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading ? "Submitting..." : "Submit Report"}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 20,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#f9fafb",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipSelected: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  chipText: { fontSize: 13, color: "#475569", fontWeight: "500" },
  chipTextSelected: { color: "#fff" },
  locationBtn: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  locationBtnText: { fontSize: 14, fontWeight: "600", color: "#1d4ed8" },
  locationSet: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationText: { fontSize: 13, color: "#166534", fontWeight: "500" },
  linkText: { fontSize: 13, color: "#1d4ed8", fontWeight: "600" },
  photoActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  photoBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  photoBtnText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  imagePreview: { marginRight: 8, position: "relative" },
  previewImage: { width: 80, height: 80, borderRadius: 8 },
  removeBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  analysisText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "500",
  },
  analysisTextDirty: { color: "#166534" },
  analysisTextClean: { color: "#b45309" },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  checkLabel: { fontSize: 14, color: "#475569" },
  submitBtn: {
    backgroundColor: "#1d4ed8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
