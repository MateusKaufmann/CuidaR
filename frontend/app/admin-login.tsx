import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, API_URL } from "../src/theme";

export default function AdminLogin() {
  const router = useRouter();
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!pwd) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/admin/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      const d = await r.json();
      if (d.ok) {
        router.replace("/admin");
      } else {
        Alert.alert("Acesso negado", "Senha incorreta.");
      }
    } catch { Alert.alert("Erro", "Falha ao verificar."); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Área do Administrador</Text>
        <Text style={styles.subtitle}>Informe a senha para acessar</Text>

        <TextInput testID="admin-pwd-input" value={pwd} onChangeText={setPwd}
          placeholder="Senha" placeholderTextColor={COLORS.textSecondary}
          style={styles.input} secureTextEntry keyboardType="number-pad"
          onSubmitEditing={verify} />

        <TouchableOpacity testID="admin-enter-btn" style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={verify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> :
            <Text style={styles.btnText}>Entrar</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#FDECE5",
    alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary },
  subtitle: { color: COLORS.textSecondary, textAlign: "center", marginTop: 6, marginBottom: 24 },
  input: { width: "100%", backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    fontSize: 18, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  btn: { width: "100%", backgroundColor: COLORS.primary, padding: 16, borderRadius: 14,
    alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
