import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../src/theme";

export default function Admin() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Painel do Administrador</Text>
      <Text style={styles.sub}>Acesse estatísticas completas e configurações.</Text>

      <TouchableOpacity testID="admin-stats-btn" style={[styles.card, { backgroundColor: COLORS.primary }]}
        onPress={() => router.push("/stats")}>
        <View style={styles.iconWrap}><Ionicons name="stats-chart" size={30} color={COLORS.primary} /></View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.cardTitle}>Estatísticas</Text>
          <Text style={styles.cardSub}>Gráficos e análises por período</Text>
        </View>
        <Ionicons name="chevron-forward" size={26} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity testID="admin-settings-btn" style={[styles.card, { backgroundColor: COLORS.secondary }]}
        onPress={() => router.push("/settings")}>
        <View style={styles.iconWrap}><Ionicons name="settings" size={30} color={COLORS.secondary} /></View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.cardTitle}>Configurações</Text>
          <Text style={styles.cardSub}>Senha, meta de água, nome</Text>
        </View>
        <Ionicons name="chevron-forward" size={26} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 4 },
  sub: { color: COLORS.textSecondary, marginBottom: 20 },
  card: { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 22, marginBottom: 12 },
  iconWrap: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  cardSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
});
