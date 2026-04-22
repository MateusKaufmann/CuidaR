import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, API_URL } from "../src/theme";

type CG = { id: string; name: string };

export default function Caregivers() {
  const [list, setList] = useState<CG[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/caregivers`);
      setList(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim()) return Alert.alert("Atenção", "Informe o nome.");
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/caregivers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!r.ok) throw new Error();
      setName("");
      await load();
    } catch { Alert.alert("Erro", "Falha ao cadastrar."); }
    finally { setSaving(false); }
  };

  const del = (id: string, nm: string) => {
    Alert.alert("Remover", `Remover "${nm}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        await fetch(`${API_URL}/caregivers/${id}`, { method: "DELETE" });
        load();
      }},
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Cadastrar cuidador(a)</Text>
          <Text style={styles.hint}>
            Cada registro de insulina, alimentação, água ou compra será associado ao cuidador que estiver selecionado no dispositivo.
          </Text>
          <Text style={styles.label}>Nome</Text>
          <TextInput testID="cg-name-input" value={name} onChangeText={setName}
            placeholder="Ex.: Maria" placeholderTextColor={COLORS.textSecondary} style={styles.input} />
          <TouchableOpacity testID="cg-add-btn" style={[styles.btn, saving && { opacity: 0.6 }]}
            onPress={add} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.btnText}>Cadastrar</Text></>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Cuidadores ({list.length})</Text>
        {loading ? <ActivityIndicator color={COLORS.primary} /> :
          list.length === 0 ? (
            <Text style={{ color: COLORS.textSecondary, textAlign: "center", padding: 20 }}>
              Nenhum cuidador cadastrado.
            </Text>
          ) : list.map(c => (
            <View key={c.id} style={styles.row}>
              <Ionicons name="person-circle" size={28} color={COLORS.secondary} />
              <Text style={styles.rowName}>{c.name}</Text>
              <TouchableOpacity onPress={() => del(c.id, c.name)} style={{ padding: 8 }}>
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
  title: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 4 },
  hint: { fontSize: 12, color: COLORS.textSecondary, fontStyle: "italic", marginBottom: 10 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, fontSize: 15,
    color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  btn: { flexDirection: "row", backgroundColor: COLORS.secondary, padding: 14, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginTop: 14, gap: 8 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginTop: 20, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, gap: 10 },
  rowName: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
});
