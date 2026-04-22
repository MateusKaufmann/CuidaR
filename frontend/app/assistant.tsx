import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, API_URL, formatDateBR } from "../src/theme";

export default function Assistant() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/assistant`);
        setData(await r.json());
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!data) return <View style={styles.center}><Text>Erro ao carregar</Text></View>;

  const { good, concerns } = data.insights;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Ionicons name="sparkles" size={28} color="#fff" /></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Resumo da Semana</Text>
          <Text style={styles.sub}>{formatDateBR(data.start)} — {formatDateBR(data.end)}</Text>
        </View>
      </View>

      <View style={[styles.card, { borderLeftColor: COLORS.success, borderLeftWidth: 4 }]}>
        <View style={styles.rowHead}>
          <Ionicons name="happy" size={22} color={COLORS.success} />
          <Text style={styles.cardTitle}>Pontos positivos ({good.length})</Text>
        </View>
        {good.length === 0 ? (
          <Text style={styles.empty}>Ainda sem destaques positivos esta semana.</Text>
        ) : good.map((g: string, i: number) => (
          <View key={i} style={styles.item}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.itemText}>{g}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { borderLeftColor: COLORS.error, borderLeftWidth: 4 }]}>
        <View style={styles.rowHead}>
          <Ionicons name="alert-circle" size={22} color={COLORS.error} />
          <Text style={styles.cardTitle}>Pontos de atenção ({concerns.length})</Text>
        </View>
        {concerns.length === 0 ? (
          <Text style={styles.empty}>Nenhum ponto preocupante. 🎉</Text>
        ) : concerns.map((c: string, i: number) => (
          <View key={i} style={styles.item}>
            <Ionicons name="warning" size={18} color={COLORS.error} />
            <Text style={styles.itemText}>{c}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>Análise baseada nos últimos 7 dias de registros.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  container: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary },
  sub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 6 },
  itemText: { flex: 1, color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  empty: { color: COLORS.textSecondary, fontStyle: "italic" },
  footer: { textAlign: "center", color: COLORS.textSecondary, fontSize: 12, marginTop: 10 },
});
