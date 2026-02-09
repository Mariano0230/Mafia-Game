# 🎭 Juego de Mafia - Multijugador Online

Un juego de mafia interactivo multijugador en tiempo real, desarrollado con Node.js, Express y Socket.io.

## 📋 Descripción

Este es un juego basado en el clásico juego de cartas "Mafia". Los jugadores se conectan desde sus propios dispositivos, son asignados secretamente a diferentes roles y deben trabajar para cumplir los objetivos de su equipo.

### Roles del Juego

- **🔫 Mafia**: Elimina a los demás jugadores durante la noche. 1 mafia por cada 3 jugadores.
- **👮 Policía**: Investiga a un jugador cada noche. Si es mafia, lo captura.
- **⚕️ Curandero**: Protege a un jugador cada noche (incluso a sí mismo) de ser asesinado.
- **👤 Pueblo**: Ciudadanos comunes que deben ayudar a identificar a la mafia.

### Reglas

1. Mínimo 6 jugadores para comenzar
2. Cada 3 jugadores hay 1 mafia
3. Siempre hay 1 policía y 1 curandero
4. El resto son ciudadanos del pueblo

#### Fase Nocturna
1. Las mafias votan para asesinar a alguien
2. El policía investiga a un sospechoso
3. El curandero protege a alguien

#### Resultados
- Si el curandero salvó a la víctima de la mafia, no muere
- Si el policía encuentra a un mafioso, lo captura
- Si el policía no encuentra a un mafioso, hay fase de votación

#### Fase de Votación
- Los jugadores votan para expulsar a alguien
- Pueden saltarse la votación

#### Condiciones de Victoria
- **Pueblo gana**: Cuando todos los mafiosos son eliminados
- **Mafia gana**: Cuando hay igual o más mafiosos que ciudadanos
## 📄 Licencia

Uso libre para propósitos educativos y recreativos.

---

¡Disfruta del juego! 🎭
