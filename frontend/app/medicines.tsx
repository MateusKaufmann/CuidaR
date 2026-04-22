import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, API_URL, todayStr, formatDateBR } from "../src/theme";
import CaregiverPicker from "../src/CaregiverPicker";
import { useCaregiver } from "../src/useCaregiver";

type Medicine = { id: string; name: string; origin: string };
type Purchase = { id: string; medicine_id: string; medicine_name: string;
  date: string; quantity?: string | null; notes?: string | null; caregiver?: string | null };

export default function MedicinesScreen() {
  const { current: currentCaregiver } = useCaregiver();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selMed, setSelMed] = useState<string>("");
  const [date, setDate] = useState(todayStr());
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([
        fetch(`${API_URL}/medicines`).then(r => r.json()),
        fetch(`${API_URL}/medicine-purchases?limit=200`).then(r => r.json()),
      ]);
      setMedicines(m || []);
      setPurchases(p || []);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [load]);

  const save = async () => {
    if (!selMed) return Alert.alert("Atenção", "Escolha um remédio.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return Alert.alert("Atenção", "Data inválida.");
    if (!currentCaregiver)
      return Alert.alert("Atenção", "Selecione o cuidador no topo.");
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/medicine-purchases`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicine_id: selMed, date,
          quantity: quantity || undefined,
          notes: notes || undefined,
          caregiver: currentCaregiver,
        }),
      });
      if (!r.ok) throw new Error();
      setSelMed(""); setQuantity(""); setNotes("");
      await load();
    } catch { Alert.alert("Erro", "Falha ao salvar."); }
    finally { setSaving(false); }
  };

  const del = (id: string) => {
    Alert.alert("Remover", "Remover esta compra?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        await fetch(`${API_URL}/medicine-purchases/${id}`, { method: "DELETE" });
        load();
      }},
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <CaregiverPicker />

        {loading ? <ActivityIndicator color={COLORS.primary} /> : medicines.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="medkit-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>
              Nenhum remédio cadastrado ainda.{"\n"}Cadastre em Administrador → Remédios.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Remédios cadastrados</Text>
            {medicines.map(m => (
              <View key={m.id} style={styles.medCard}>
                <View style={styles.medIcon}>
                  <Ionicons name="medkit" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{m.name}</Text>
                  <Text style={styles.medOrigin}>Origem: {m.origin}</Text>
                </View>
              </View>
            ))}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Registrar compra</Text>

              <Text style={styles.label}>Remédio</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
                {medicines.map(m => {
                  const active = selMed === m.id;
                  return (
                    <TouchableOpacity key={m.id}
                      style={[styles.selChip, active && styles.selChipActive]}
                      onPress={() => setSelMed(m.id)}>
                      <Text style={[styles.selChipText, active && { color: "#fff" }]}>{m.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>Data da compra</Text>
              <TextInput value={date} onChangeText={setDate} placeholder="AAAA-MM-DD"
                placeholderTextColor={COLORS.textSecondary} style={styles.input} />

              <Text style={styles.label}>Quantidade (opcional)</Text>
              <TextInput value={quantity} onChangeText={setQuantity} placeholder="Ex.: 2 caixas"
                placeholderTextColor={COLORS.textSecondary} style={styles.input} />

              <Text style={styles.label}>Observações (opcional)</Text>
              <TextInput value={notes} onChangeText={setNotes} placeholder="Observações..."
                placeholderTextColor={COLORS.textSecondary} style={[styles.input, { height: 70 }]} multiline />

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="cart" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Registrar compra</Text></>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Histórico de compras</Text>
            {purchases.length === 0 ? (
              <Text style={{ color: COLORS.textSecondary, textAlign: "center", padding: 20 }}>
                Nenhuma compra registrada.
              </Text>
            ) : purchases.map(p => (
              <View key={p.id} style={styles.purchaseCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{p.medicine_name}</Text>
                  <Text style={styles.histSub}>
                    Comprado em {formatDateBR(p.date)}
                    {p.quantity ? ` • ${p.quantity}` : ""}
                  </Text>
                  {p.caregiver ? <Text style={styles.caregiver}>por {p.caregiver}</Text> : null}
                  {p.notes ? <Text style={styles.notes}>{p.notes}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => del(p.id)} style={{ padding: 8 }}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary, marginVertical: 12 },
  medCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface,
    padding: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  medIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FDECE5",
    alignItems: "center", justifyContent: "center", marginRight: 12 },
  medName: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  medOrigin: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 14 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 10 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, fontSize: 15,
    color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, textAlignVertical: "top" },
  selChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.background },
  selChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  selChipText: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary },
  saveBtn: { flexDirection: "row", backgroundColor: COLORS.primary, padding: 14, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginTop: 14, gap: 8 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  purchaseCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface,
    padding: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  histSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  caregiver: { fontSize: 12, color: COLORS.primary, fontWeight: "700", marginTop: 2 },
  notes: { fontSize: 12, color: COLORS.textSecondary, fontStyle: "italic", marginTop: 4 },
  empty: { alignItems: "center", padding: 40 },
  emptyText: { color: COLORS.textSecondary, marginTop: 10, textAlign: "center" },
});
