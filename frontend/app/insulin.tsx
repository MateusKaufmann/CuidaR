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
import CaregiverPicker from "../src/CaregiverPicker";
import { useCaregiver } from "../src/useCaregiver";

type Insulin = {
  id: string;
  date: string;
  time: string;
  glucose: number;
  fast_insulin_units?: number | null;
  notes?: string | null;
};

export default function InsulinScreen() {
  const { current: currentCaregiver } = useCaregiver();
  const [records, setRecords] = useState<Insulin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(nowTime());
  const [glucose, setGlucose] = useState("");
  const [insulinUnits, setInsulinUnits] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/insulin?limit=200`);
      const data = await res.json();
      setRecords(data);
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

  const onSave = async () => {
    const g = parseFloat(glucose.replace(",", "."));
    if (!glucose || isNaN(g)) {
      Alert.alert("Atenção", "Informe a medição de glicemia (mg/dL).");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Atenção", "Data inválida. Use o formato AAAA-MM-DD.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert("Atenção", "Hora inválida. Use o formato HH:MM.");
      return;
    }

    // Validation warnings for unusual values
    const warnings: string[] = [];
    if (g < 40) warnings.push(`Glicemia ${g} mg/dL é muito BAIXA`);
    if (g > 500) warnings.push(`Glicemia ${g} mg/dL é muito ALTA`);
    const u = insulinUnits ? parseFloat(insulinUnits.replace(",", ".")) : NaN;
    if (!isNaN(u) && u > 20) warnings.push(`${u} UI de insulina rápida é um valor ALTO`);
    if (!isNaN(u) && u < 0) warnings.push(`Valor negativo de insulina`);

    const doSave = async () => {
      if (!currentCaregiver) {
        Alert.alert("Atenção", "Selecione o cuidador que está registrando.");
        return;
      }
      setSaving(true);
      try {
        const payload: any = { date, time, glucose: g, caregiver: currentCaregiver };
        if (!isNaN(u)) payload.fast_insulin_units = u;
        if (notes) payload.notes = notes;
        const res = await fetch(`${API_URL}/insulin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Erro ao salvar");
        setGlucose("");
        setInsulinUnits("");
        setNotes("");
        setTime(nowTime());
        await load();
      } catch (e) {
        Alert.alert("Erro", "Não foi possível salvar o registro.");
      } finally {
        setSaving(false);
      }
    };

    if (warnings.length > 0) {
      Alert.alert(
        "Valor incomum — confirmar?",
        warnings.join("\n") + "\n\nVocê tem certeza que deseja salvar?",
        [
          { text: "Revisar", style: "cancel" },
          { text: "Salvar mesmo assim", style: "destructive", onPress: doSave },
        ]
      );
    } else {
      doSave();
    }
  };

  const onDelete = (id: string) => {
    Alert.alert("Remover", "Deseja remover este registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          await fetch(`${API_URL}/insulin/${id}`, { method: "DELETE" });
          load();
        },
      },
    ]);
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
        <CaregiverPicker />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Novo registro</Text>

          <View style={styles.row2}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Data</Text>
              <TextInput
                testID="insulin-date-input"
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
                testID="insulin-time-input"
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Glicemia (mg/dL) *</Text>
          <TextInput
            testID="insulin-glucose-input"
            value={glucose}
            onChangeText={setGlucose}
            placeholder="Ex.: 120"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.label}>Insulina rápida (UI) — opcional</Text>
          <TextInput
            testID="insulin-units-input"
            value={insulinUnits}
            onChangeText={setInsulinUnits}
            placeholder="Ex.: 4"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.label}>Observações (opcional)</Text>
          <TextInput
            testID="insulin-notes-input"
            value={notes}
            onChangeText={setNotes}
            placeholder="Alguma observação..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          />

          <TouchableOpacity
            testID="insulin-save-btn"
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.saveBtnText}>Salvar registro</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Histórico</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="medkit-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>Nenhum registro ainda.</Text>
          </View>
        ) : (
          records.map((r) => (
            <View key={r.id} style={styles.recordCard} testID={`insulin-record-${r.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recordDate}>
                  {formatDateBR(r.date)} • {r.time}
                </Text>
                <View style={{ flexDirection: "row", marginTop: 6, gap: 12, flexWrap: "wrap" }}>
                  <View style={styles.pill}>
                    <Ionicons name="pulse" size={14} color={COLORS.primary} />
                    <Text style={styles.pillText}>{r.glucose} mg/dL</Text>
                  </View>
                  {r.fast_insulin_units != null && (
                    <View style={[styles.pill, { backgroundColor: "#E4F0EA" }]}>
                      <Ionicons name="medkit" size={14} color={COLORS.secondary} />
                      <Text style={styles.pillText}>{r.fast_insulin_units} UI</Text>
                    </View>
                  )}
                </View>
                {r.notes ? <Text style={styles.notes}>{r.notes}</Text> : null}
              </View>
              <TouchableOpacity
                testID={`insulin-delete-${r.id}`}
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
  saveBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
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
    backgroundColor: "#FDECE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  pillText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: "600" },
  notes: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  caregiverTag: { fontSize: 12, color: COLORS.primary, fontWeight: "700", marginTop: 4 },
  deleteBtn: { padding: 10 },
  empty: { alignItems: "center", padding: 30 },
  emptyText: { color: COLORS.textSecondary, marginTop: 10 },
});
