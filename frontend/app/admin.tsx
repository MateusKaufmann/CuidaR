import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../src/theme";

export default function Admin() {
  const router = useRouter();

  const cards = [
    { testID: "admin-stats-btn", route: "/stats", title: "Estatísticas",
      sub: "Gráficos e análises por período", icon: "stats-chart", bg: COLORS.primary },
    { testID: "admin-reports-btn", route: "/reports", title: "Relatórios PDF",
      sub: "Exportar por semana, mês ou período", icon: "document-text", bg: COLORS.accent },
    { testID: "admin-medicines-btn", route: "/medicines-admin", title: "Remédios",
      sub: "Cadastrar medicamentos", icon: "medical", bg: "#9B6A8F" },
    { testID: "admin-caregivers-btn", route: "/caregivers", title: "Cuidadores",
      sub: "Cadastrar cuidadores", icon: "people", bg: COLORS.secondary },
    { testID: "admin-settings-btn", route: "/settings", title: "Configurações",
      sub: "Senha, meta de água, nome da paciente", icon: "settings", bg: "#5A6478" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Painel do Administrador</Text>
      <Text style={styles.sub}>Gerencie cadastros, relatórios e configurações.</Text>

      {cards.map(c => (
        <TouchableOpacity key={c.testID} testID={c.testID}
          style={[styles.card, { backgroundColor: c.bg }]}
          onPress={() => router.push(c.route as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name={c.icon as any} size={28} color={c.bg} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.cardSub}>{c.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 4 },
  sub: { color: COLORS.textSecondary, marginBottom: 20 },
  card: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 20, marginBottom: 10 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cardSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
});
