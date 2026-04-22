import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#F7F5F0" },
          headerTintColor: "#3D405B",
          headerTitleStyle: { fontWeight: "700", fontSize: 20 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#F7F5F0" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="insulin" options={{ title: "Insulina" }} />
        <Stack.Screen name="food" options={{ title: "Alimentação" }} />
        <Stack.Screen name="water" options={{ title: "Água" }} />
        <Stack.Screen name="stats" options={{ title: "Estatísticas" }} />
        <Stack.Screen name="reports" options={{ title: "Relatórios" }} />
        <Stack.Screen
          name="admin-login"
          options={{ title: "Área do Administrador" }}
        />
        <Stack.Screen name="admin" options={{ title: "Administrador" }} />
        <Stack.Screen name="settings" options={{ title: "Configurações" }} />
        <Stack.Screen name="assistant" options={{ title: "Assistente" }} />
        <Stack.Screen name="medicines" options={{ title: "Remédios" }} />
        <Stack.Screen name="medicines-admin" options={{ title: "Cadastro de Remédios" }} />
        <Stack.Screen name="caregivers" options={{ title: "Cuidadores" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
