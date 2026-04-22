# Cuidados da Vovó — PRD

## Overview
Aplicativo mobile (Expo SDK 54) para monitorar os cuidados diários de uma idosa, com foco em simplicidade e acessibilidade. Destinado a ser instalado em 2 dispositivos (tablet na casa da idosa para cuidadoras e celular da filha), com sincronização automática dos dados via backend MongoDB.

## Problem
Família precisa acompanhar remotamente a rotina de cuidados da idosa (glicemia/insulina, alimentação, hidratação) e gerar relatórios para consultas médicas.

## Features Implementadas

### Core
- **Home** com 3 botões grandes: INSULINA, ALIMENTAÇÃO, ÁGUA
- **Tela Insulina**: registrar data, hora, glicemia (mg/dL), insulina rápida em UI (opcional), observações; lista do histórico com remoção
- **Tela Alimentação**: 6 refeições (Café, Lanche, Almoço, Lanche da Tarde, Janta, Ceia) com status (comeu tudo / comeu metade / não comeu) + observações opcionais por refeição; registro consolidado por dia (upsert)
- **Tela Água**: registrar data, hora, quantidade em ml, observações; barra de progresso com meta diária (2000 ml); botões rápidos +100/+200/+250/+500 ml

### Extras (solicitados pelo usuário)
- **Estatísticas (7 dias)**: gráfico de barras (água/dia), gráfico de linha (glicemia média/dia), contadores de refeições por status
- **Exportar PDF**: relatório completo com todos os registros (insulina, alimentação, água) via `expo-print` + `expo-sharing`
- **Sincronização**: auto-refresh a cada 30 segundos em todas as telas + pull-to-refresh

### Design
- Paleta acolhedora/orgânica (terracota, sálvia, azul suave) sobre fundo creme
- Touch targets grandes, tipografia legível, cantos arredondados

## Tech Stack
- **Frontend**: Expo Router, React Native 0.81, TypeScript, react-native-chart-kit, expo-print, expo-sharing
- **Backend**: FastAPI + Motor (MongoDB async)
- **DB**: MongoDB (local), coleções: `insulin`, `food`, `water`

## API Endpoints
- `POST/GET/DELETE /api/insulin` (filtro opcional por `date`)
- `POST/GET /api/food` (upsert por data) | `DELETE /api/food/{id}`
- `POST/GET/DELETE /api/water` (filtro opcional por `date`)
- `GET /api/stats?days=7` — agregações para gráficos

## Data Models
- `InsulinRecord`: id, date, time, glucose, fast_insulin_units?, notes?, created_at
- `FoodRecord`: id, date, {cafe, lanche, almoco, lanche_tarde, janta, ceia}: {status?, notes?}
- `WaterRecord`: id, date, time, amount_ml, notes?, created_at

## Sem autenticação
Decisão explícita do usuário: uso restrito a 2 dispositivos familiares, sem necessidade de login.

## Future Enhancements
- Notificações push/local para lembretes
- Selector de data/hora nativo
- Múltiplas idosas/perfis
- Tempo real via WebSocket (atualmente polling de 30s)
