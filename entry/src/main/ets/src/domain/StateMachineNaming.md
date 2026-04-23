# Convenciones para máquina de estados

## Estados (`State`)
- Prefijo: `Match` para estados de dominio (ej. `MatchIdleState`).
- Uso de `UpperCamelCase` para nombres de tipo.
- Campo serializable `status` con valor en `UPPER_SNAKE_CASE`.

## Eventos (`Event`)
- Sufijo obligatorio `Event` (ej. `StartMatchEvent`).
- Verbos en infinitivo en inglés para acciones (`Start`, `Pause`, `Resume`, `Finish`).
- Eventos de UI empiezan por `Ui` cuando no son de dominio (ej. `UiTapPrimaryEvent`).

## Convención de reducers
- Método puro: `reduce(currentState, event)`.
- Cada transición se define con función `on<EventName>()`.
