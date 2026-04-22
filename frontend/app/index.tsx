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

const CARDS: {
  testID: string;
  route: string;
  title: string;
  sub: string;
  icon: any;
  bg: string;
}[] = [
  { testID: "home-insulin-btn", route: "/insulin", title: "INSULINA",
    sub: "Glicemia e aplicações", icon: "medkit", bg: COLORS.primary },
  { testID: "home-food-btn", route: "/food", title: "ALIMENTAÇÃO",
    sub: "Registro das 6 refeições", icon: "restaurant", bg: COLORS.secondary },
  { testID: "home-water-btn", route: "/water", title: "ÁGUA",
    sub: "Hidratação em mililitros", icon: "water", bg: COLORS.accent },
  { testID: "home-medicines-btn", route: "/medicines", title: "REMÉDIOS",
    sub: "Compras e medicamentos", icon: "medical", bg: "#9B6A8F" },
  { testID: "home-assistant-btn", route: "/assistant", title: "ASSISTENTE",
    sub: "Resumo inteligente da semana", icon: "sparkles", bg: "#D62828" },
  { testID: "home-admin-btn", route: "/admin-login", title: "ADMINISTRADOR",
    sub: "Relatórios, gráficos, cadastros", icon: "shield-checkmark", bg: "#5A6478" },
];

export default function Index() {
  const router = useRouter();
  const [splashStage, setSplashStage] = useState<0 | 1 | 2 | 3>(0);
  const [showSplash, setShowSplash] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patientName, setPatientName] = useState("Vovó");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashStage(1), 200);
    const t2 = setTimeout(() => setSplashStage(2), 900);
    const t3 = setTimeout(() => setSplashStage(3), 1900);
    const t4 = setTimeout(() => setShowSplash(false), 2400);
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
      <View style={[styles.splash, splashStage >= 3 && { opacity: 0 }]}>
        <View style={styles.splashRow}>
          <Text style={styles.rLetter}>R</Text>
          <Text style={[styles.careText, splashStage < 2 && { opacity: 0 }]}>Care</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, cuidador</Text>
          <View style={styles.brandRow}>
            <Text style={styles.brandR}>R</Text>
            <Text style={styles.brandCare}>Care</Text>
          </View>
          <Text style={styles.subtitle}>
            Cuidando de {patientName} • {formatDateBR(todayStr())}
          </Text>
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

        <Text style={styles.sectionTitle}>O que deseja acessar?</Text>

        {CARDS.map(card => (
          <TouchableOpacity
            key={card.testID}
            testID={card.testID}
            style={[styles.bigCard, { backgroundColor: card.bg }]}
            activeOpacity={0.85}
            onPress={() => router.push(card.route as any)}
          >
            <View style={styles.bigIconCircle}>
              <Ionicons name={card.icon} size={32} color={card.bg} />
            </View>
            <View style={styles.bigTextWrap}>
              <Text style={styles.bigCardTitle}>{card.title}</Text>
              <Text style={styles.bigCardSub}>{card.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={26} color="#fff" />
          </TouchableOpacity>
        ))}

        <Text style={styles.footer}>
          Sincroniza automaticamente entre dispositivos
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  splash: { flex: 1, backgroundColor: "#F7F5F0", alignItems: "center", justifyContent: "center" },
  splashRow: { flexDirection: "row", alignItems: "center" },
  rLetter: { fontSize: 96, fontWeight: "900", color: "#D62828", letterSpacing: -3 },
  careText: { fontSize: 80, fontWeight: "800", color: "#3D405B", letterSpacing: -1 },

  container: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 18 },
  greeting: { color: COLORS.textSecondary, fontSize: 14, fontWeight: "500" },
  brandRow: { flexDirection: "row", alignItems: "baseline", marginTop: 2 },
  brandR: { fontSize: 32, fontWeight: "900", color: "#D62828", letterSpacing: -1 },
  brandCare: { fontSize: 32, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },

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
  bigCard: { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 22,
    marginBottom: 12, elevation: 3 },
  bigIconCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center" },
  bigTextWrap: { flex: 1, marginLeft: 14 },
  bigCardTitle: { color: "#fff", fontSize: 19, fontWeight: "800", letterSpacing: 0.3 },
  bigCardSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  footer: { textAlign: "center", color: COLORS.textSecondary, fontSize: 12, marginTop: 12 },
});
