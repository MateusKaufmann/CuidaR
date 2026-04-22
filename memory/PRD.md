# RCare — PRD

## Overview
App mobile (Expo SDK 54) para monitorar cuidados diários de uma idosa, com sincronização automática entre 2 dispositivos via backend MongoDB.

## Features

### Home (6 cards)
- INSULINA, ALIMENTAÇÃO, ÁGUA, REMÉDIOS (public), ASSISTENTE, ADMINISTRADOR

### Coleta diária (com cuidador)
Todas as telas de registro exibem **CaregiverPicker** no topo. O cuidador selecionado é persistido em AsyncStorage e enviado em cada POST:
- Insulina: data, hora, glicemia, insulina rápida (opcional), observações, cuidador
- Alimentação (6 refeições): status + obs por refeição, data, cuidador. **Confirmação de edição** se data ≠ hoje
- Água: data, hora, ml, observações, cuidador + meta configurável
- Remédios: lista cadastrados + registra compras (data, quantidade, obs, cuidador)

### Admin (senha 2255)
- Estatísticas (gráficos por período; timeline de eventos se dia único)
- Relatórios PDF (Semana, Este mês, Todo período, Personalizado) — **apenas inconsistências** (inclui missing-data), food com linha extra de observações, seção Remédios, coluna Cuidador
- **Remédios**: cadastrar (nome + origem livre) e remover (cascade purchases)
- **Cuidadores**: cadastrar e remover
- Configurações: senha, meta água, nome paciente

### Assistente (público)
Resumo semanal dos últimos 7 dias com pontos positivos e preocupações (datas DD/MM/AAAA)

### Home extras
- Splash RCare (R vermelho + Care)
- Card de avisos do dia (café/almoço/janta/glicemia/água não registrados)

## API
- `POST/GET/DELETE /api/insulin` (+ `caregiver`)
- `POST/GET /api/food` (+ `caregiver`) | `DELETE /api/food/{id}`
- `POST/GET/DELETE /api/water` (+ `caregiver`)
- `POST/GET/DELETE /api/caregivers`
- `POST/GET/DELETE /api/medicines`
- `POST/GET/DELETE /api/medicine-purchases`
- `GET /api/reports?period=week|month|all|custom` (retorna `purchases`, concerns incluindo missing-data)
- `GET /api/assistant` (7 dias)
- `GET /api/inconsistencies` (dia atual)
- `GET/POST /api/settings`
- `POST /api/admin/verify`, `POST /api/admin/change-password`

## Test Credentials
- Admin password: **2255**

## Collections (MongoDB)
- `insulin`, `food`, `water`, `caregivers`, `medicines`, `medicine_purchases`, `settings`

## Sem autenticação de usuário
Uso restrito a 2 dispositivos familiares. Apenas área admin (estatísticas/relatórios/cadastros/configurações) é protegida por senha.
