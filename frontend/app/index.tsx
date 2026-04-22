import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, API_URL, formatDateBR, todayStr } from "../src/theme";

type Alert = { level: string; message: string };

export default function Index() {
  const router = useRouter();
  const [splashStage, setSplashStage] = useState<0 | 1 | 2 | 3>(0);
  // 0: nothing, 1: R visible, 2: Care sliding in, 3: fading out / hidden
  const [showSplash, setShowSplash] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patientName, setPatientName] = useState("Vovó");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashStage(1), 200);
    const t2 = setTimeout(() => setSplashStage(2), 900);
    const t3 = setTimeout(() => setSplashStage(3), 2000);
    const t4 = setTimeout(() => setShowSplash(false), 2600);
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, []);

  const loadData = async () => {
    try {
      const [alertsRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/inconsistencies`).then(r => r.json()),
        fetch(`${API_URL}/settings`).then(r => r.json()),
      ]);
      setAlerts(alertsRes.alerts || []);
      if (settingsRes?.patient_name) setPatientName(settingsRes.patient_name);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashRow}>
          <Text style={styles.rLetter}>R</Text>
          <Text style={[styles.careText, splashStage < 2 && { opacity: 0 }]}>Care</Text>
        </View>
        <Text style={styles.splashTag}>Cuidado com carinho</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Olá, cuidador</Text>
            <View style={styles.brandRow}>
              <Text style={styles.brandR}>R</Text>
              <Text style={styles.brandCare}>Care</Text>
            </View>
            <Text style={styles.subtitle}>
              Cuidando de {patientName} • {formatDateBR(todayStr())}
            </Text>
          </View>
          <TouchableOpacity
            testID="home-admin-btn"
            style={styles.adminBtn}
            onPress={() => router.push("/admin-login")}
          >
            <Ionicons name="person-circle" size={34} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : alerts.length > 0 ? (
          <View style={styles.alertsCard} testID="home-alerts-card">
            <View style={styles.alertsHead}>
              <Ionicons name="notifications" size={20} color={COLORS.error} />
              <Text style={styles.alertsTitle}>Avisos de hoje ({alerts.length})</Text>
            </View>
            {alerts.map((a, i) => (
              <View key={i} style={styles.alertItem}>
                <Ionicons name="warning" size={16} color={COLORS.error} />
                <Text style={styles.alertText}>{a.message}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.okCard}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
            <Text style={styles.okText}>Tudo em dia até agora! 👏</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>O que deseja registrar?</Text>

        <TouchableOpacity
          testID="home-insulin-btn"
          style={[styles.bigCard, { backgroundColor: COLORS.primary }]}
          activeOpacity={0.85}
          onPress={() => router.push("/insulin")}
        >
          <View style={styles.bigIconCircle}>
            <Ionicons name="medkit" size={34} color={COLORS.primary} />
          </View>
          <View style={styles.bigTextWrap}>
            <Text style={styles.bigCardTitle}>INSULINA</Text>
            <Text style={styles.bigCardSub}>Glicemia e aplicações</Text>
          </View>
          <Ionicons name="chevron-forward" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="home-food-btn"
          style={[styles.bigCard, { backgroundColor: COLORS.secondary }]}
          activeOpacity={0.85}
          onPress={() => router.push("/food")}
        >
          <View style={styles.bigIconCircle}>
            <Ionicons name="restaurant" size={34} color={COLORS.secondary} />
          </View>
          <View style={styles.bigTextWrap}>
            <Text style={styles.bigCardTitle}>ALIMENTAÇÃO</Text>
            <Text style={styles.bigCardSub}>Registro das 6 refeições</Text>
          </View>
          <Ionicons name="chevron-forward" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="home-water-btn"
          style={[styles.bigCard, { backgroundColor: COLORS.accent }]}
          activeOpacity={0.85}
          onPress={() => router.push("/water")}
        >
          <View style={styles.bigIconCircle}>
            <Ionicons name="water" size={34} color={COLORS.accent} />
          </View>
          <View style={styles.bigTextWrap}>
            <Text style={styles.bigCardTitle}>ÁGUA</Text>
            <Text style={styles.bigCardSub}>Hidratação em mililitros</Text>
          </View>
          <Ionicons name="chevron-forward" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="home-reports-btn"
          style={styles.secondaryBtn}
          onPress={() => router.push("/reports")}
        >
          <Ionicons name="document-text" size={24} color={COLORS.textPrimary} />
          <Text style={styles.secondaryBtnText}>Gerar relatório PDF</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.footer}>
          Sincroniza automaticamente entre dispositivos
        </Text>
      </ScrollView>

      <TouchableOpacity
        testID="home-assistant-fab"
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push("/assistant")}
      >
        <Ionicons name="sparkles" size={26} color="#fff" />
        <Text style={styles.fabText}>Assistente</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  splash: { flex: 1, backgroundColor: "#F7F5F0", alignItems: "center", justifyContent: "center" },
  splashRow: { flexDirection: "row", alignItems: "center" },
  rLetter: { fontSize: 88, fontWeight: "900", color: "#D62828", letterSpacing: -2 },
  careText: { fontSize: 72, fontWeight: "800", color: "#3D405B", letterSpacing: -1 },
  splashTag: { marginTop: 16, fontSize: 16, color: COLORS.textSecondary, fontWeight: "600" },

  container: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  greeting: { color: COLORS.textSecondary, fontSize: 14, fontWeight: "500" },
  brandRow: { flexDirection: "row", alignItems: "baseline", marginTop: 2 },
  brandR: { fontSize: 32, fontWeight: "900", color: "#D62828", letterSpacing: -1 },
  brandCare: { fontSize: 32, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  adminBtn: { padding: 8 },

  alertsCard: { backgroundColor: "#FBDFE0", borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: "#F5B5B8", marginBottom: 18 },
  alertsHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  alertsTitle: { fontSize: 15, fontWeight: "800", color: COLORS.error },
  alertItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  alertText: { flex: 1, color: COLORS.textPrimary, fontSize: 13, lineHeight: 18 },

  okCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#E4F0EA",
    padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "#A9CFB9", marginBottom: 18 },
  okText: { color: COLORS.textPrimary, fontWeight: "700" },

  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  bigCard: { flexDirection: "row", alignItems: "center", padding: 20, borderRadius: 24,
    marginBottom: 14, elevation: 3 },
  bigIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center" },
  bigTextWrap: { flex: 1, marginLeft: 16 },
  bigCardTitle: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.5 },
  bigCardSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },

  secondaryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, paddingVertical: 16, paddingHorizontal: 18,
    borderRadius: 18, gap: 10, marginTop: 4 },
  secondaryBtnText: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: "700" },
  footer: { textAlign: "center", color: COLORS.textSecondary, fontSize: 12, marginTop: 16 },

  fab: { position: "absolute", bottom: 22, right: 18, backgroundColor: "#D62828",
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 30, flexDirection: "row",
    alignItems: "center", gap: 8, elevation: 6,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
