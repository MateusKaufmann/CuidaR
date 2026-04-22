import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Platform, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { COLORS, API_URL, formatDateBR, todayStr } from "../src/theme";

type Period = "week" | "month" | "all" | "custom";

const PERIODS: { key: Period; label: string; icon: any }[] = [
  { key: "week", label: "Semana", icon: "calendar-outline" },
  { key: "month", label: "Este mês", icon: "calendar" },
  { key: "all", label: "Todo período", icon: "albums" },
  { key: "custom", label: "Personalizado", icon: "options" },
];

export default function Reports() {
  const [period, setPeriod] = useState<Period>("week");
  const [start, setStart] = useState(todayStr());
  const [end, setEnd] = useState(todayStr());
  const [loading, setLoading] = useState(false);

  const mealLbl = (s?: string) =>
    s === "comeu_tudo" ? "Comeu tudo" :
    s === "comeu_metade" ? "Comeu metade" :
    s === "nao_comeu" ? "Não comeu" : "-";

  const generate = async () => {
    setLoading(true);
    try {
      const url = period === "custom"
        ? `${API_URL}/reports?period=custom&start=${start}&end=${end}`
        : `${API_URL}/reports?period=${period}`;
      const r = await fetch(url);
      const data = await r.json();
      const { insulin, food, water, insights } = data;

      const periodLabel = PERIODS.find(p => p.key === period)?.label;

      const html = `
<html><head><meta charset="utf-8"/>
<style>
body { font-family: Helvetica, Arial, sans-serif; color: #3D405B; padding: 24px; }
h1 { color: #E07A5F; margin-bottom: 4px; }
h2 { color: #81B29A; margin-top: 28px; border-bottom: 2px solid #E3DDCF; padding-bottom: 6px; }
h3 { color: #7FA3B5; margin-top: 18px; }
table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
th, td { border: 1px solid #E3DDCF; padding: 6px 8px; text-align: left; }
th { background: #EFEBE1; }
.meta { color: #6A6E8B; font-size: 12px; }
.good { background: #E4F0EA; padding: 10px 14px; border-left: 4px solid #2A9D8F; margin: 6px 0; border-radius: 6px; }
.bad { background: #FBDFE0; padding: 10px 14px; border-left: 4px solid #E63946; margin: 6px 0; border-radius: 6px; }
</style></head><body>
<h1>RCare — Relatório de Cuidados</h1>
<div class="meta">Período: ${formatDateBR(data.start)} — ${formatDateBR(data.end)} (${periodLabel})<br/>
Gerado em ${formatDateBR(todayStr())}</div>

<h2>Controle de Insulina / Glicemia (${insulin.length} registros)</h2>
<table><thead><tr><th>Data</th><th>Hora</th><th>Glicemia (mg/dL)</th><th>Insulina Rápida (UI)</th><th>Obs.</th></tr></thead><tbody>
${insulin.map((i:any)=>`<tr><td>${formatDateBR(i.date)}</td><td>${i.time}</td><td>${i.glucose}</td><td>${i.fast_insulin_units??"-"}</td><td>${i.notes??""}</td></tr>`).join("")}
</tbody></table>

<h2>Alimentação (${food.length} dias)</h2>
<table><thead><tr><th>Data</th><th>Café</th><th>Lanche</th><th>Almoço</th><th>Lanche Tarde</th><th>Janta</th><th>Ceia</th></tr></thead><tbody>
${food.map((f:any)=>`<tr><td>${formatDateBR(f.date)}</td><td>${mealLbl(f.cafe?.status)}</td><td>${mealLbl(f.lanche?.status)}</td><td>${mealLbl(f.almoco?.status)}</td><td>${mealLbl(f.lanche_tarde?.status)}</td><td>${mealLbl(f.janta?.status)}</td><td>${mealLbl(f.ceia?.status)}</td></tr>`).join("")}
</tbody></table>

<h2>Consumo de Água (${water.length} registros)</h2>
<table><thead><tr><th>Data</th><th>Hora</th><th>Quantidade (ml)</th><th>Obs.</th></tr></thead><tbody>
${water.map((w:any)=>`<tr><td>${formatDateBR(w.date)}</td><td>${w.time}</td><td>${w.amount_ml}</td><td>${w.notes??""}</td></tr>`).join("")}
</tbody></table>

<h2>Inconsistências e Destaques</h2>
<h3>Pontos positivos</h3>
${insights.good.length===0?'<p>Nenhum destaque.</p>':insights.good.map((g:string)=>`<div class="good">✓ ${g}</div>`).join("")}
<h3>Pontos de atenção</h3>
${insights.concerns.length===0?'<p>Nenhum ponto preocupante. 🎉</p>':insights.concerns.map((c:string)=>`<div class="bad">⚠ ${c}</div>`).join("")}

</body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === "web") {
        window.open(uri, "_blank");
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
      } else {
        Alert.alert("PDF gerado", uri);
      }
    } catch (e) {
      Alert.alert("Erro", "Não foi possível gerar o relatório.");
    } finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Gerar Relatório PDF</Text>
      <Text style={styles.sub}>Escolha o período desejado:</Text>

      <View style={styles.grid}>
        {PERIODS.map(p => {
          const active = period === p.key;
          return (
            <TouchableOpacity key={p.key}
              testID={`report-period-${p.key}`}
              style={[styles.periodCard, active && styles.periodActive]}
              onPress={() => setPeriod(p.key)}>
              <Ionicons name={p.icon} size={24} color={active ? "#fff" : COLORS.primary} />
              <Text style={[styles.periodText, active && { color: "#fff" }]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {period === "custom" && (
        <View style={styles.customBox}>
          <Text style={styles.label}>Data inicial</Text>
          <TextInput value={start} onChangeText={setStart} placeholder="AAAA-MM-DD"
            placeholderTextColor={COLORS.textSecondary} style={styles.input} />
          <Text style={styles.label}>Data final</Text>
          <TextInput value={end} onChangeText={setEnd} placeholder="AAAA-MM-DD"
            placeholderTextColor={COLORS.textSecondary} style={styles.input} />
        </View>
      )}

      <TouchableOpacity testID="report-generate-btn"
        style={[styles.generateBtn, loading && { opacity: 0.6 }]} onPress={generate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="document-text" size={22} color="#fff" />
            <Text style={styles.generateText}>Gerar PDF</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.footer}>O PDF incluirá todos os registros, insights e inconsistências do período.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 6 },
  sub: { color: COLORS.textSecondary, marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  periodCard: { width: "47%", backgroundColor: COLORS.surface, padding: 20, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, alignItems: "center", gap: 8 },
  periodActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodText: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  customBox: { marginTop: 16, backgroundColor: COLORS.surface, padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border },
  label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: "600" },
  input: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, fontSize: 16,
    color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  generateBtn: { flexDirection: "row", backgroundColor: COLORS.primary, padding: 18,
    borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 },
  generateText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footer: { textAlign: "center", color: COLORS.textSecondary, fontSize: 12, marginTop: 16 },
});
