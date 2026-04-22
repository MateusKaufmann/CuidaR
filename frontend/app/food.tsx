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
import { COLORS, API_URL, todayStr, formatDateBR } from "../src/theme";

type MealKey = "cafe" | "lanche" | "almoco" | "lanche_tarde" | "janta" | "ceia";
type Status = "comeu_tudo" | "comeu_metade" | "nao_comeu" | null;

const MEALS: { key: MealKey; label: string; icon: any }[] = [
  { key: "cafe", label: "Café da manhã", icon: "sunny" },
  { key: "lanche", label: "Lanche", icon: "cafe" },
  { key: "almoco", label: "Almoço", icon: "restaurant" },
  { key: "lanche_tarde", label: "Lanche da tarde", icon: "fast-food" },
  { key: "janta", label: "Janta", icon: "pizza" },
  { key: "ceia", label: "Ceia", icon: "moon" },
];

const STATUS_OPTIONS: { key: Status; label: string; color: string }[] = [
  { key: "comeu_tudo", label: "Comeu tudo", color: COLORS.success },
  { key: "comeu_metade", label: "Comeu metade", color: "#E9B949" },
  { key: "nao_comeu", label: "Não comeu", color: COLORS.error },
];

type DayRecord = {
  cafe?: { status?: Status; notes?: string };
  lanche?: { status?: Status; notes?: string };
  almoco?: { status?: Status; notes?: string };
  lanche_tarde?: { status?: Status; notes?: string };
  janta?: { status?: Status; notes?: string };
  ceia?: { status?: Status; notes?: string };
};

export default function FoodScreen() {
  const [date, setDate] = useState(todayStr());
  const [record, setRecord] = useState<DayRecord>({});
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dayRes, histRes] = await Promise.all([
        fetch(`${API_URL}/food?date=${date}`).then((r) => r.json()),
        fetch(`${API_URL}/food?limit=30`).then((r) => r.json()),
      ]);
      if (dayRes.length > 0) {
        setRecord(dayRes[0]);
      } else {
        setRecord({});
      }
      setHistory(histRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const updateMeal = (key: MealKey, field: "status" | "notes", value: any) => {
    setRecord((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value },
    }));
  };

  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Atenção", "Data inválida.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = { date };
      MEALS.forEach((m) => {
        const entry = (record as any)[m.key];
        if (entry && (entry.status || entry.notes)) {
          payload[m.key] = {
            status: entry.status || null,
            notes: entry.notes || null,
          };
        }
      });
      const res = await fetch(`${API_URL}/food`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro");
      await load();
      Alert.alert("Salvo!", "Registro do dia atualizado.");
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

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
        <View style={styles.dateCard}>
          <Text style={styles.label}>Data do registro</Text>
          <TextInput
            testID="food-date-input"
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
          />
          <Text style={styles.dateHint}>{formatDateBR(date)}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <>
            {MEALS.map((meal) => {
              const entry = (record as any)[meal.key] || {};
              return (
                <View key={meal.key} style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <View style={styles.mealIconWrap}>
                      <Ionicons
                        name={meal.icon}
                        size={22}
                        color={COLORS.secondary}
                      />
                    </View>
                    <Text style={styles.mealTitle}>{meal.label}</Text>
                  </View>

                  <View style={styles.statusRow}>
                    {STATUS_OPTIONS.map((opt) => {
                      const active = entry.status === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          testID={`food-${meal.key}-${opt.key}`}
                          style={[
                            styles.statusBtn,
                            active && {
                              backgroundColor: opt.color,
                              borderColor: opt.color,
                            },
                          ]}
                          onPress={() =>
                            updateMeal(
                              meal.key,
                              "status",
                              active ? null : opt.key
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.statusBtnText,
                              active && { color: "#fff" },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    testID={`food-${meal.key}-notes`}
                    value={entry.notes || ""}
                    onChangeText={(v) => updateMeal(meal.key, "notes", v)}
                    placeholder="Observações (opcional)"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.notesInput}
                    multiline
                  />
                </View>
              );
            })}

            <TouchableOpacity
              testID="food-save-btn"
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.saveBtnText}>Salvar dia</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.sectionHeader}>Histórico recente</Text>
        {history.length === 0 ? (
          <Text style={{ color: COLORS.textSecondary, textAlign: "center" }}>
            Nenhum histórico ainda.
          </Text>
        ) : (
          history.map((h) => {
            const count = MEALS.filter(
              (m) => (h as any)[m.key]?.status
            ).length;
            return (
              <TouchableOpacity
                key={h.id}
                style={styles.histCard}
                onPress={() => setDate(h.date)}
              >
                <View>
                  <Text style={styles.histDate}>{formatDateBR(h.date)}</Text>
                  <Text style={styles.histSub}>
                    {count} de 6 refeições registradas
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  dateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateHint: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  mealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  mealHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  mealIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E4F0EA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  mealTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  statusRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  statusBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  notesInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 44,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
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
  histCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  histDate: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  histSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
