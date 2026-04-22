import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions,
  TouchableOpacity, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, LineChart } from "react-native-chart-kit";
import { COLORS, API_URL, formatDateBR, todayStr } from "../src/theme";

type Period = "week" | "month" | "all" | "custom";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Este mês" },
  { key: "all", label: "Todo período" },
  { key: "custom", label: "Personalizado" },
];

const screenWidth = Dimensions.get("window").width;

export default function StatsScreen() {
  const [period, setPeriod] = useState<Period>("week");
  const [start, setStart] = useState(todayStr());
  const [end, setEnd] = useState(todayStr());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const url = period === "custom"
        ? `${API_URL}/reports?period=custom&start=${start}&end=${end}`
        : `${API_URL}/reports?period=${period}`;
      const r = await fetch(url);
      setData(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [period]);

  // Build aggregated time-series from report data
  const buildSeries = () => {
    if (!data) return { labels: [], water: [], glucose: [] };
    const waterMap: Record<string, number> = {};
    const glucMap: Record<string, { sum: number; count: number }> = {};
    data.water.forEach((w: any) => {
      waterMap[w.date] = (waterMap[w.date] || 0) + w.amount_ml;
    });
    data.insulin.forEach((i: any) => {
      if (!glucMap[i.date]) glucMap[i.date] = { sum: 0, count: 0 };
      glucMap[i.date].sum += i.glucose;
      glucMap[i.date].count += 1;
    });
    const allDates = Array.from(
      new Set([...Object.keys(waterMap), ...Object.keys(glucMap)])
    ).sort();
    const labels = allDates.map(d => {
      const [, m, day] = d.split("-");
      return `${day}/${m}`;
    });
    const water = allDates.map(d => waterMap[d] || 0);
    const glucose = allDates.map(d =>
      glucMap[d] ? Math.round(glucMap[d].sum / glucMap[d].count) : 0
    );
    // Limit labels for readability
    const maxPoints = 14;
    if (labels.length > maxPoints) {
      const step = Math.ceil(labels.length / maxPoints);
      const l: string[] = [], w: number[] = [], g: number[] = [];
      for (let i = 0; i < labels.length; i += step) {
        l.push(labels[i]); w.push(water[i]); g.push(glucose[i]);
      }
      return { labels: l, water: w, glucose: g };
    }
    return { labels, water, glucose };
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (o = 1) => `rgba(127, 163, 181, ${o})`,
    labelColor: (o = 1) => `rgba(61, 64, 91, ${o})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#E07A5F" },
    barPercentage: 0.6,
  };

  const series = buildSeries();

  const mealCounts = { comeu_tudo: 0, comeu_metade: 0, nao_comeu: 0 };
  if (data) {
    data.food.forEach((f: any) => {
      ["cafe", "lanche", "almoco", "lanche_tarde", "janta", "ceia"].forEach(k => {
        const s = f[k]?.status;
        if (s) (mealCounts as any)[s] = ((mealCounts as any)[s] || 0) + 1;
      });
    });
  }

  const totalWater = series.water.reduce((a, b) => a + b, 0);
  const totalMeals = mealCounts.comeu_tudo + mealCounts.comeu_metade + mealCounts.nao_comeu;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.periodRow}>
        {PERIODS.map(p => {
          const active = period === p.key;
          return (
            <TouchableOpacity key={p.key}
              testID={`stats-period-${p.key}`}
              style={[styles.periodBtn, active && styles.periodActive]}
              onPress={() => setPeriod(p.key)}>
              <Text style={[styles.periodText, active && { color: "#fff" }]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {period === "custom" && (
        <View style={styles.customBox}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Início</Text>
              <TextInput value={start} onChangeText={setStart} placeholder="AAAA-MM-DD"
                placeholderTextColor={COLORS.textSecondary} style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fim</Text>
              <TextInput value={end} onChangeText={setEnd} placeholder="AAAA-MM-DD"
                placeholderTextColor={COLORS.textSecondary} style={styles.input} />
            </View>
          </View>
          <TouchableOpacity style={styles.applyBtn} onPress={load}>
            <Text style={styles.applyBtnText}>Aplicar</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading || !data ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 30 }} />
      ) : (
        <>
          <Text style={styles.subtitle}>
            {formatDateBR(data.start)} — {formatDateBR(data.end)}
          </Text>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: "#FDECE5" }]}>
              <Ionicons name="pulse" size={22} color={COLORS.primary} />
              <Text style={styles.summaryNum}>{data.insulin.length}</Text>
              <Text style={styles.summaryLbl}>Medições</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#E4EDF2" }]}>
              <Ionicons name="water" size={22} color={COLORS.accent} />
              <Text style={styles.summaryNum}>
                {totalWater >= 1000 ? `${(totalWater / 1000).toFixed(1)}L` : `${totalWater}ml`}
              </Text>
              <Text style={styles.summaryLbl}>Água total</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#E4F0EA" }]}>
              <Ionicons name="restaurant" size={22} color={COLORS.secondary} />
              <Text style={styles.summaryNum}>{totalMeals}</Text>
              <Text style={styles.summaryLbl}>Refeições</Text>
            </View>
          </View>

          {series.labels.length > 0 ? (
            <>
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>💧 Água por dia (ml)</Text>
                <BarChart
                  data={{ labels: series.labels, datasets: [{ data: series.water }] }}
                  width={screenWidth - 48} height={220}
                  chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(127, 163, 181, ${o})` }}
                  yAxisLabel="" yAxisSuffix="" fromZero showValuesOnTopOfBars style={styles.chart}
                />
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>💉 Glicemia média (mg/dL)</Text>
                {series.glucose.some(v => v > 0) ? (
                  <LineChart
                    data={{ labels: series.labels, datasets: [{ data: series.glucose }] }}
                    width={screenWidth - 48} height={220}
                    chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(224, 122, 95, ${o})` }}
                    bezier fromZero style={styles.chart}
                  />
                ) : (
                  <Text style={styles.emptyChart}>Sem dados de glicemia no período.</Text>
                )}
              </View>
            </>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="analytics-outline" size={48} color={COLORS.border} />
              <Text style={{ color: COLORS.textSecondary, marginTop: 10 }}>
                Sem dados para o período selecionado.
              </Text>
            </View>
          )}

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>🍽️ Refeições (status)</Text>
            <View style={styles.mealRow}>
              <View style={[styles.mealBox, { backgroundColor: "#E4F0EA" }]}>
                <Text style={styles.mealBoxNum}>{mealCounts.comeu_tudo}</Text>
                <Text style={styles.mealBoxLbl}>Comeu tudo</Text>
              </View>
              <View style={[styles.mealBox, { backgroundColor: "#FBEFD6" }]}>
                <Text style={styles.mealBoxNum}>{mealCounts.comeu_metade}</Text>
                <Text style={styles.mealBoxLbl}>Metade</Text>
              </View>
              <View style={[styles.mealBox, { backgroundColor: "#FBDFE0" }]}>
                <Text style={styles.mealBoxNum}>{mealCounts.nao_comeu}</Text>
                <Text style={styles.mealBoxLbl}>Não comeu</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  periodRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  periodBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  periodActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodText: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary },
  customBox: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  label: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: "600" },
  input: { backgroundColor: COLORS.background, borderRadius: 10, padding: 10, fontSize: 14,
    color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  applyBtn: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 10,
    alignItems: "center", marginTop: 10 },
  applyBtnText: { color: "#fff", fontWeight: "700" },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12, fontWeight: "600" },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  summaryNum: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary, marginTop: 6 },
  summaryLbl: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  chartCard: { backgroundColor: "#fff", borderRadius: 22, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border },
  chartTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 8 },
  chart: { borderRadius: 16, marginLeft: -8 },
  emptyChart: { color: COLORS.textSecondary, padding: 30, textAlign: "center" },
  emptyBox: { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  mealRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  mealBox: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center" },
  mealBoxNum: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary },
  mealBoxLbl: { fontSize: 12, color: COLORS.textPrimary, marginTop: 4, fontWeight: "600" },
});
