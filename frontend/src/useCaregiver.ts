import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback } from "react";
import { API_URL } from "./theme";

const KEY = "rcare_current_caregiver";

export type Caregiver = { id: string; name: string };

export function useCaregiver() {
  const [current, setCurrent] = useState<string>("");
  const [list, setList] = useState<Caregiver[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const [stored, res] = await Promise.all([
        AsyncStorage.getItem(KEY),
        fetch(`${API_URL}/caregivers`).then(r => r.json()),
      ]);
      setList(res || []);
      if (stored) setCurrent(stored);
    } catch (e) { console.error(e); }
    finally { setReady(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const select = async (name: string) => {
    setCurrent(name);
    await AsyncStorage.setItem(KEY, name);
  };

  return { current, list, ready, select, reload: load };
}
