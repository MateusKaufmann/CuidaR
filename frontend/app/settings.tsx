import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, API_URL } from "../src/theme";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [waterGoal, setWaterGoal] = useState("2000");
  const [patientName, setPatientName] = useState("Vovó");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [savingGen, setSavingGen] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/settings`);
        const d = await r.json();
        setWaterGoal(String(d.water_goal_ml));
        setPatientName(d.patient_name);
      } finally { setLoading(false); }
    })();
  }, []);

  const saveGeneral = async () => {
    const goal = parseInt(waterGoal, 10);
    if (isNaN(goal) || goal < 100 || goal > 10000) {
      return Alert.alert("Atenção", "Meta de água deve estar entre 100 e 10000 ml.");
    }
    if (!patientName.trim()) return Alert.alert("Atenção", "Nome não pode ficar vazio.");
    setSavingGen(true);
    try {
      const r = await fetch(`${API_URL}/settings`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ water_goal_ml: goal, patient_name: patientName.trim() }),
      });
      if (!r.ok) throw new Error();
      Alert.alert("Salvo", "Configurações atualizadas!");
    } catch { Alert.alert("Erro", "Falha ao salvar"); }
    finally { setSavingGen(false); }
  };

  const changePwd = async () => {
    if (!oldPwd || !newPwd) return Alert.alert("Atenção", "Preencha ambos os campos.");
    setSavingPwd(true);
    try {
      const r = await fetch(`${API_URL}/admin/change-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }),
      });
      if (!r.ok) {
        const e = await r.json();
        return Alert.alert("Erro", e.detail || "Falha");
      }
      Alert.alert("Sucesso", "Senha alterada!");
      setOldPwd(""); setNewPwd("");
    } catch { Alert.alert("Erro", "Falha"); }
    finally { setSavingPwd(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.headRow}>
            <Ionicons name="person" size={22} color={COLORS.secondary} />
            <Text style={styles.cardTitle}>Paciente</Text>
          </View>
          <Text style={styles.label}>Nome</Text>
          <TextInput testID="settings-name-input" value={patientName} onChangeText={setPatientName}
            style={styles.input} placeholder="Nome da paciente" placeholderTextColor={COLORS.textSecondary} />
        </View>

        <View style={styles.card}>
          <View style={styles.headRow}>
            <Ionicons name="water" size={22} color={COLORS.accent} />
            <Text style={styles.cardTitle}>Meta de hidratação diária</Text>
          </View>
          <Text style={styles.label}>Quantidade (ml)</Text>
          <TextInput testID="settings-water-input" value={waterGoal} onChangeText={setWaterGoal}
            style={styles.input} keyboardType="numeric"
            placeholder="2000" placeholderTextColor={COLORS.textSecondary} />
          <Text style={styles.hint}>Usado como referência na tela de água.</Text>
        </View>

        <TouchableOpacity testID="settings-save-btn" style={[styles.saveBtn, savingGen && { opacity: 0.6 }]}
          onPress={saveGeneral} disabled={savingGen}>
          {savingGen ? <ActivityIndicator color="#fff" /> : (
            <><Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Salvar configurações</Text></>
          )}
        </TouchableOpacity>

        <View style={[styles.card, { marginTop: 24 }]}>
          <View style={styles.headRow}>
            <Ionicons name="key" size={22} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Alterar senha do administrador</Text>
          </View>
          <Text style={styles.label}>Senha atual</Text>
          <TextInput testID="settings-old-pwd" value={oldPwd} onChangeText={setOldPwd}
            style={styles.input} secureTextEntry placeholder="••••" placeholderTextColor={COLORS.textSecondary} />
          <Text style={styles.label}>Nova senha</Text>
          <TextInput testID="settings-new-pwd" value={newPwd} onChangeText={setNewPwd}
            style={styles.input} secureTextEntry placeholder="Nova senha" placeholderTextColor={COLORS.textSecondary} />
          <TouchableOpacity testID="settings-change-pwd-btn"
            style={[styles.pwdBtn, savingPwd && { opacity: 0.6 }]}
            onPress={changePwd} disabled={savingPwd}>
            {savingPwd ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.saveBtnText}>Alterar senha</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  container: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border },
  headRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary },
  label: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6, fontWeight: "600", marginTop: 8 },
  input: { backgroundColor: COLORS.background, borderRadius: 12, padding: 14, fontSize: 16,
    color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, fontStyle: "italic" },
  saveBtn: { flexDirection: "row", backgroundColor: COLORS.secondary, padding: 16,
    borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 8 },
  pwdBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: "center", marginTop: 12 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
