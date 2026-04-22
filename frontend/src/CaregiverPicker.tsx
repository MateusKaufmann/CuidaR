import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { COLORS } from "./theme";
import { useCaregiver } from "./useCaregiver";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function CaregiverPicker() {
  const router = useRouter();
  const { current, list, select } = useCaregiver();

  if (list.length === 0) {
    return (
      <TouchableOpacity
        testID="caregiver-no-registered"
        style={styles.empty}
        onPress={() => router.push("/admin-login")}
      >
        <Ionicons name="people" size={18} color={COLORS.error} />
        <Text style={styles.emptyText}>
          Nenhum cuidador cadastrado. Toque para cadastrar (Admin).
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        <Ionicons name="person" size={14} color={COLORS.textSecondary} /> Cuidador que está registrando:
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {list.map(c => {
          const active = current === c.name;
          return (
            <TouchableOpacity
              key={c.id}
              testID={`caregiver-pick-${c.name}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => select(c.name)}
            >
              <Text style={[styles.chipText, active && { color: "#fff" }]}>{c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginBottom: 6 },
  row: { gap: 8, paddingRight: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary },
  empty: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10,
    backgroundColor: "#FBDFE0", borderRadius: 12, marginBottom: 12 },
  emptyText: { flex: 1, color: COLORS.textPrimary, fontSize: 12 },
});
