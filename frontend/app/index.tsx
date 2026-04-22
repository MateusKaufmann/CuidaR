import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { COLORS, API_URL, formatDateBR, todayStr } from "../src/theme";

type Stats = {
  dates: string[];
  water_by_date: number[];
  glucose_by_date: number[];
  meal_counts: Record<string, number>;
  total_insulin_records: number;
  total_water_ml: number;
};

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_URL}/stats?days=7`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const todayWater = stats
    ? stats.water_by_date[stats.water_by_date.length - 1] || 0
    : 0;
  const todayGlucose = stats
    ? stats.glucose_by_date[stats.glucose_by_date.length - 1] || 0
    : 0;

  const exportPDF = async () => {
    setExporting(true);
    try {
      const [insulin, food, water] = await Promise.all([
        fetch(`${API_URL}/insulin?limit=200`).then((r) => r.json()),
        fetch(`${API_URL}/food?limit=60`).then((r) => r.json()),
        fetch(`${API_URL}/water?limit=200`).then((r) => r.json()),
      ]);

      const mealLabel = (s?: string) =>
        s === "comeu_tudo"
          ? "Comeu tudo"
          : s === "comeu_metade"
          ? "Comeu metade"
          : s === "nao_comeu"
          ? "Não comeu"
          : "-";

      const html = `
        <html><head><meta charset="utf-8"/>
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #3D405B; padding: 24px; }
          h1 { color: #E07A5F; margin-bottom: 4px; }
          h2 { color: #81B29A; margin-top: 28px; border-bottom: 2px solid #E3DDCF; padding-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
          th, td { border: 1px solid #E3DDCF; padding: 6px 8px; text-align: left; }
          th { background: #EFEBE1; }
          .meta { color: #6A6E8B; font-size: 12px; }
          .summary { background: #EFEBE1; padding: 12px; border-radius: 8px; margin-top: 12px; }
        </style></head><body>
        <h1>Relatório de Cuidados</h1>
        <div class="meta">Gerado em ${formatDateBR(todayStr())}</div>
        <div class="summary">
          <b>Resumo (últimos 7 dias):</b><br/>
          Total de medições de glicemia: ${stats?.total_insulin_records ?? 0}<br/>
          Total de água consumida: ${stats?.total_water_ml ?? 0} ml
        </div>

        <h2>Controle de Insulina / Glicemia</h2>
        <table><thead><tr><th>Data</th><th>Hora</th><th>Glicemia (mg/dL)</th><th>Insulina Rápida (UI)</th><th>Obs.</th></tr></thead><tbody>
        ${insulin
          .map(
            (i: any) =>
              `<tr><td>${formatDateBR(i.date)}</td><td>${i.time}</td><td>${
                i.glucose
              }</td><td>${i.fast_insulin_units ?? "-"}</td><td>${
                i.notes ?? ""
              }</td></tr>`
          )
          .join("")}
        </tbody></table>

        <h2>Alimentação</h2>
        <table><thead><tr><th>Data</th><th>Café</th><th>Lanche</th><th>Almoço</th><th>Lanche Tarde</th><th>Janta</th><th>Ceia</th></tr></thead><tbody>
        ${food
          .map(
            (f: any) =>
              `<tr><td>${formatDateBR(f.date)}</td><td>${mealLabel(
                f.cafe?.status
              )}</td><td>${mealLabel(f.lanche?.status)}</td><td>${mealLabel(
                f.almoco?.status
              )}</td><td>${mealLabel(f.lanche_tarde?.status)}</td><td>${mealLabel(
                f.janta?.status
              )}</td><td>${mealLabel(f.ceia?.status)}</td></tr>`
          )
          .join("")}
        </tbody></table>

        <h2>Consumo de Água</h2>
        <table><thead><tr><th>Data</th><th>Hora</th><th>Quantidade (ml)</th><th>Obs.</th></tr></thead><tbody>
        ${water
          .map(
            (w: any) =>
              `<tr><td>${formatDateBR(w.date)}</td><td>${w.time}</td><td>${
                w.amount_ml
              }</td><td>${w.notes ?? ""}</td></tr>`
          )
          .join("")}
        </tbody></table>
        </body></html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === "web") {
        window.open(uri, "_blank");
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            UTI: ".pdf",
            mimeType: "application/pdf",
          });
        } else {
          Alert.alert("PDF gerado", uri);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, cuidador</Text>
          <Text style={styles.title}>Cuidados da Vovó</Text>
          <Text style={styles.subtitle}>
            Acompanhe diariamente. Hoje: {formatDateBR(todayStr())}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <View style={styles.quickStats}>
            <View style={[styles.quickCard, { backgroundColor: "#FDECE5" }]}>
              <Ionicons name="water" size={20} color={COLORS.primary} />
              <Text style={styles.quickLabel}>Glicemia hoje</Text>
              <Text style={styles.quickValue}>
                {todayGlucose > 0 ? `${todayGlucose}` : "—"}
                <Text style={styles.quickUnit}> mg/dL</Text>
              </Text>
            </View>
            <View style={[styles.quickCard, { backgroundColor: "#E4F0EA" }]}>
              <Ionicons name="cafe" size={20} color={COLORS.secondary} />
              <Text style={styles.quickLabel}>Refeições 7d</Text>
              <Text style={styles.quickValue}>
                {stats
                  ? (stats.meal_counts.comeu_tudo || 0) +
                    (stats.meal_counts.comeu_metade || 0) +
                    (stats.meal_counts.nao_comeu || 0)
                  : 0}
              </Text>
            </View>
            <View style={[styles.quickCard, { backgroundColor: "#E4EDF2" }]}>
              <Ionicons name="beaker" size={20} color={COLORS.accent} />
              <Text style={styles.quickLabel}>Água hoje</Text>
              <Text style={styles.quickValue}>
                {todayWater}
                <Text style={styles.quickUnit}> ml</Text>
              </Text>
            </View>
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

        <View style={styles.row}>
          <TouchableOpacity
            testID="home-stats-btn"
            style={[styles.secondaryBtn, { flex: 1, marginRight: 8 }]}
            onPress={() => router.push("/stats")}
          >
            <Ionicons name="stats-chart" size={22} color={COLORS.textPrimary} />
            <Text style={styles.secondaryBtnText}>Estatísticas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="home-export-btn"
            style={[styles.secondaryBtn, { flex: 1, marginLeft: 8 }]}
            onPress={exportPDF}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <>
                <Ionicons
                  name="document-text"
                  size={22}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.secondaryBtnText}>Exportar PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Sincroniza automaticamente entre dispositivos a cada 30s
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  greeting: { color: COLORS.textSecondary, fontSize: 16, fontWeight: "500" },
  title: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
  quickStats: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickCard: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
  quickValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  quickUnit: { fontSize: 12, fontWeight: "500", color: COLORS.textSecondary },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  bigCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  bigIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  bigTextWrap: { flex: 1, marginLeft: 16 },
  bigCardTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bigCardSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  row: { flexDirection: "row", marginTop: 10 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 20,
  },
});
