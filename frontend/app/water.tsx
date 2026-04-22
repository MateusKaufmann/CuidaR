import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, API_URL, todayStr, nowTime, formatDateBR } from "../src/theme";

type Water = {
  id: string;
  date: string;
  time: string;
  amount_ml: number;
  notes?: string | null;
};

const QUICK_ML = [100, 200, 250, 500];

export default function WaterScreen() {
  const [records, setRecords] = useState<Water[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(nowTime());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState(2000);

  const load = useCallback(async () => {
    try {
      const [recRes, setRes] = await Promise.all([
        fetch(`${API_URL}/water?limit=200`).then(r => r.json()),
        fetch(`${API_URL}/settings`).then(r => r.json()),
      ]);
      setRecords(recRes);
      if (setRes?.water_goal_ml) setGoal(setRes.water_goal_ml);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const todayTotal = records
    .filter((r) => r.date === todayStr())
    .reduce((s, r) => s + r.amount_ml, 0);

  const save = async () => {
    const ml = parseInt(amount, 10);
    if (!amount || isNaN(ml) || ml <= 0) {
      Alert.alert("Atenção", "Informe a quantidade em ml.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert("Atenção", "Data ou hora inválidas.");
      return;
    }

    const doSave = async () => {
      setSaving(true);
      try {
        const payload: any = { date, time, amount_ml: ml };
        if (notes) payload.notes = notes;
        const res = await fetch(`${API_URL}/water`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Erro");
        setAmount("");
        setNotes("");
        setTime(nowTime());
        await load();
      } catch (e) {
        Alert.alert("Erro", "Não foi possível salvar.");
      } finally {
        setSaving(false);
      }
    };

    if (ml > 1000) {
      Alert.alert(
        "Valor alto — confirmar?",
        `Você inseriu ${ml} ml em um único registro. É um valor bem alto. Tem certeza?`,
        [
          { text: "Revisar", style: "cancel" },
          { text: "Salvar mesmo assim", style: "destructive", onPress: doSave },
        ]
      );
    } else {
      doSave();
    }
  };

  const goalValue = goal;

  const onDelete = (id: string) => {
    Alert.alert("Remover", "Deseja remover este registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          await fetch(`${API_URL}/water/${id}`, { method: "DELETE" });
          load();
        },
      },
    ]);
  };

  const pct = Math.min(100, Math.round((todayTotal / goalValue) * 100));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View style={styles.dropCircle}>
              <Ionicons name="water" size={34} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.progressLabel}>Hidratação de hoje</Text>
              <Text style={styles.progressValue}>
                {todayTotal}
                <Text style={styles.progressUnit}> ml</Text>
              </Text>
              <Text style={styles.progressGoal}>Meta: {goalValue} ml</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registrar consumo</Text>

          <View style={styles.row2}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Data</Text>
              <TextInput
                testID="water-date-input"
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Hora</Text>
              <TextInput
                testID="water-time-input"
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Quantidade (ml) *</Text>
          <TextInput
            testID="water-amount-input"
            value={amount}
            onChangeText={setAmount}
            placeholder="Ex.: 250"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
            style={styles.input}
          />

          <View style={styles.quickRow}>
            {QUICK_ML.map((ml) => (
              <TouchableOpacity
                key={ml}
                testID={`water-quick-${ml}`}
                style={styles.quickBtn}
                onPress={() => setAmount(String(ml))}
              >
                <Text style={styles.quickBtnText}>+{ml}ml</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Observações (opcional)</Text>
          <TextInput
            testID="water-notes-input"
            value={notes}
            onChangeText={setNotes}
            placeholder="Alguma observação..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            style={[styles.input, { height: 70, textAlignVertical: "top" }]}
          />

          <TouchableOpacity
            testID="water-save-btn"
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.saveBtnText}>Salvar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Histórico</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 20 }} />
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="water-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>Nenhum registro ainda.</Text>
          </View>
        ) : (
          records.map((r) => (
            <View key={r.id} style={styles.recordCard} testID={`water-record-${r.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recordDate}>
                  {formatDateBR(r.date)} • {r.time}
                </Text>
                <View style={styles.pill}>
                  <Ionicons name="water" size={14} color={COLORS.accent} />
                  <Text style={styles.pillText}>{r.amount_ml} ml</Text>
                </View>
                {r.notes ? <Text style={styles.notes}>{r.notes}</Text> : null}
              </View>
              <TouchableOpacity
                testID={`water-delete-${r.id}`}
                onPress={() => onDelete(r.id)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  progressCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  progressTop: { flexDirection: "row", alignItems: "center" },
  dropCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  progressValue: { color: "#fff", fontSize: 32, fontWeight: "800" },
  progressUnit: { fontSize: 14, fontWeight: "500" },
  progressGoal: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  progressBar: {
    marginTop: 14,
    height: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#fff" },
  progressPct: {
    color: "#fff",
    textAlign: "right",
    marginTop: 6,
    fontWeight: "700",
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  row2: { flexDirection: "row" },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    fontWeight: "600",
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  quickBtn: {
    flex: 1,
    backgroundColor: "#E4EDF2",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  quickBtnText: { color: COLORS.accent, fontWeight: "700", fontSize: 13 },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 10,
  },
  recordCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  recordDate: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E4EDF2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  pillText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: "600" },
  notes: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  deleteBtn: { padding: 10 },
  empty: { alignItems: "center", padding: 30 },
  emptyText: { color: COLORS.textSecondary, marginTop: 10 },
});
