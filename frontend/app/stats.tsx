import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, LineChart } from "react-native-chart-kit";
import { COLORS, API_URL, formatDateBR } from "../src/theme";

type Stats = {
  dates: string[];
  water_by_date: number[];
  glucose_by_date: number[];
  meal_counts: Record<string, number>;
  total_insulin_records: number;
  total_water_ml: number;
};

const screenWidth = Dimensions.get("window").width;

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/stats?days=7`);
        setStats(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: COLORS.textSecondary }}>
          Não foi possível carregar.
        </Text>
      </View>
    );
  }

  const chartWidth = screenWidth - 48;
  const shortLabels = stats.dates.map((d) => {
    const [, m, day] = d.split("-");
    return `${day}/${m}`;
  });

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

  const total =
    (stats.meal_counts.comeu_tudo || 0) +
    (stats.meal_counts.comeu_metade || 0) +
    (stats.meal_counts.nao_comeu || 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>Últimos 7 dias</Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: "#FDECE5" }]}>
          <Ionicons name="pulse" size={22} color={COLORS.primary} />
          <Text style={styles.summaryNum}>{stats.total_insulin_records}</Text>
          <Text style={styles.summaryLbl}>Medições</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#E4EDF2" }]}>
          <Ionicons name="water" size={22} color={COLORS.accent} />
          <Text style={styles.summaryNum}>
            {(stats.total_water_ml / 1000).toFixed(1)}L
          </Text>
          <Text style={styles.summaryLbl}>Água total</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#E4F0EA" }]}>
          <Ionicons name="restaurant" size={22} color={COLORS.secondary} />
          <Text style={styles.summaryNum}>{total}</Text>
          <Text style={styles.summaryLbl}>Refeições</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>💧 Água por dia (ml)</Text>
        <BarChart
          data={{
            labels: shortLabels,
            datasets: [{ data: stats.water_by_date.map((v) => v || 0) }],
          }}
          width={chartWidth}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (o = 1) => `rgba(127, 163, 181, ${o})`,
          }}
          yAxisLabel=""
          yAxisSuffix=""
          fromZero
          showValuesOnTopOfBars
          style={styles.chart}
        />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>💉 Glicemia média (mg/dL)</Text>
        {stats.glucose_by_date.some((v) => v > 0) ? (
          <LineChart
            data={{
              labels: shortLabels,
              datasets: [
                { data: stats.glucose_by_date.map((v) => v || 0) },
              ],
            }}
            width={chartWidth}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (o = 1) => `rgba(224, 122, 95, ${o})`,
            }}
            bezier
            fromZero
            style={styles.chart}
          />
        ) : (
          <Text style={styles.emptyChart}>Sem dados de glicemia ainda.</Text>
        )}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🍽️ Refeições (status)</Text>
        <View style={styles.mealRow}>
          <View style={[styles.mealBox, { backgroundColor: "#E4F0EA" }]}>
            <Text style={styles.mealBoxNum}>
              {stats.meal_counts.comeu_tudo || 0}
            </Text>
            <Text style={styles.mealBoxLbl}>Comeu tudo</Text>
          </View>
          <View style={[styles.mealBox, { backgroundColor: "#FBEFD6" }]}>
            <Text style={styles.mealBoxNum}>
              {stats.meal_counts.comeu_metade || 0}
            </Text>
            <Text style={styles.mealBoxLbl}>Metade</Text>
          </View>
          <View style={[styles.mealBox, { backgroundColor: "#FBDFE0" }]}>
            <Text style={styles.mealBoxNum}>
              {stats.meal_counts.nao_comeu || 0}
            </Text>
            <Text style={styles.mealBoxLbl}>Não comeu</Text>
          </View>
        </View>
      </View>

      <Text style={styles.footer}>
        Período: {formatDateBR(stats.dates[0])} —{" "}
        {formatDateBR(stats.dates[stats.dates.length - 1])}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  container: { padding: 16, paddingBottom: 40 },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: "600",
  },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryNum: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  summaryLbl: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  chart: { borderRadius: 16, marginLeft: -8 },
  emptyChart: {
    color: COLORS.textSecondary,
    padding: 30,
    textAlign: "center",
  },
  mealRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  mealBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  mealBoxNum: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary },
  mealBoxLbl: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 4,
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 10,
  },
});
