import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, API_URL } from "../src/theme";

type Medicine = { id: string; name: string; origin: string };

export default function MedicinesAdmin() {
  const [list, setList] = useState<Medicine[]>([]);
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/medicines`);
      setList(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim() || !origin.trim())
      return Alert.alert("Atenção", "Informe nome e origem.");
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/medicines`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), origin: origin.trim() }),
      });
      if (!r.ok) throw new Error();
      setName(""); setOrigin("");
      await load();
    } catch { Alert.alert("Erro", "Falha ao cadastrar."); }
    finally { setSaving(false); }
  };

  const del = (id: string, nm: string) => {
    Alert.alert("Remover", `Remover "${nm}"? Isso também remove compras vinculadas.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        await fetch(`${API_URL}/medicines/${id}`, { method: "DELETE" });
        load();
      }},
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Cadastrar novo remédio</Text>
          <Text style={styles.label}>Nome</Text>
          <TextInput testID="med-name-input" value={name} onChangeText={setName}
            placeholder="Ex.: Losartana 50mg" placeholderTextColor={COLORS.textSecondary} style={styles.input} />
          <Text style={styles.label}>Origem</Text>
          <TextInput testID="med-origin-input" value={origin} onChangeText={setOrigin}
            placeholder="Ex.: SUS, Farmácia Popular, Particular..."
            placeholderTextColor={COLORS.textSecondary} style={styles.input} />
          <TouchableOpacity testID="med-add-btn" style={[styles.btn, saving && { opacity: 0.6 }]}
            onPress={add} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.btnText}>Cadastrar</Text></>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Cadastrados ({list.length})</Text>
        {loading ? <ActivityIndicator color={COLORS.primary} /> :
          list.length === 0 ? (
            <Text style={{ color: COLORS.textSecondary, textAlign: "center", padding: 20 }}>
              Nenhum remédio cadastrado.
            </Text>
          ) : list.map(m => (
            <View key={m.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{m.name}</Text>
                <Text style={styles.rowOrigin}>{m.origin}</Text>
              </View>
              <TouchableOpacity onPress={() => del(m.id, m.name)} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))
        }
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 8 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, fontSize: 15,
    color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  btn: { flexDirection: "row", backgroundColor: COLORS.primary, padding: 14, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginTop: 14, gap: 8 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginTop: 20, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  rowName: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  rowOrigin: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
