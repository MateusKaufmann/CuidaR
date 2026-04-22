# RCare — PRD

## Overview
Aplicativo mobile (Expo SDK 54) para monitorar os cuidados diários de uma idosa, com sincronização automática entre 2 dispositivos (tablet e celular) via backend MongoDB.

## Features

### Core
- **Splash screen**: abertura com logo "R" vermelho + "Care" e tagline "Cuidado com carinho"
- **Home (RCare)** com card de avisos do dia + 3 botões (INSULINA / ALIMENTAÇÃO / ÁGUA) + FAB Assistente + botões Relatórios e Admin
- **Insulina**: data/hora/glicemia/insulina-rápida(opcional)/obs — com validações: alerta para glicemia <40 ou >500 e insulina >20 UI
- **Alimentação**: 6 refeições (Café, Lanche, Almoço, Lanche Tarde, Janta, Ceia) com status (comeu_tudo/metade/não_comeu) + obs — upsert por data
- **Água**: ml + barra de progresso com meta configurável — alerta para registros >1000ml

### Recursos adicionais
- **Assistente (FAB)** acessível a todos: resumo semanal com pontos positivos e preocupantes
- **Relatórios PDF** com 4 períodos: Semana, Este mês, Todo período, Personalizado
- **Estatísticas** (admin-protegida): gráficos por período com mesmos 4 filtros
- **Card de avisos** (home): alerta sobre refeições/glicemia/água não registradas nos horários esperados
- **Admin** (senha padrão `2255`, configurável): painel com acesso a Estatísticas e Configurações
- **Configurações**: nome da paciente, meta de água diária (ml), trocar senha de admin
- **Sincronização**: auto-refresh 30s + pull-to-refresh → ambos dispositivos atualizados

## Tech Stack
- **Frontend**: Expo Router, React Native 0.81, TypeScript, react-native-chart-kit, expo-print, expo-sharing
- **Backend**: FastAPI + Motor (MongoDB async)
- **DB**: MongoDB coleções: `insulin`, `food`, `water`, `settings`

## API Endpoints
- `POST/GET/DELETE /api/insulin`
- `POST/GET /api/food` (upsert por data) | `DELETE /api/food/{id}`
- `POST/GET/DELETE /api/water`
- `GET /api/stats?days=7` (legado)
- `GET /api/reports?period=week|month|all|custom&start=&end=` — relatório completo + insights
- `GET /api/assistant` — resumo semanal
- `GET /api/inconsistencies` — avisos do dia
- `GET/POST /api/settings` — meta água e nome paciente
- `POST /api/admin/verify` — validar senha
- `POST /api/admin/change-password` — trocar senha

## Test Credentials
- Admin password: **2255** (padrão, alterável em Configurações)

## Sem autenticação de usuário
Decisão explícita do usuário: uso restrito a 2 dispositivos familiares, sem login de usuários. Apenas área admin protegida por senha para estatísticas/configurações.

## Future Enhancements
- Push notifications / lembretes
- Date/time picker nativo
- Backup para nuvem
- Tempo real via WebSocket (atualmente polling 30s)
