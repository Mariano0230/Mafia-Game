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

## 🚀 Cómo Jugar

### Opción 1: Desplegar GRATIS en Render (RECOMENDADO)

**Render** es una plataforma gratuita que te permite hostear aplicaciones Node.js sin costo.

1. **Sube el proyecto a GitHub:**
   - Crea un nuevo repositorio en GitHub
   - Sube todos los archivos de este proyecto

2. **Despliega en Render:**
   - Ve a [render.com](https://render.com) y crea una cuenta gratuita
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Configuración:
     - **Name**: mafia-game (o el nombre que quieras)
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free
   - Click en "Create Web Service"

3. **¡Listo!** Tu juego estará disponible en: `https://tu-app.onrender.com`

**Nota:** En el plan gratuito de Render, el servidor se "duerme" después de 15 minutos de inactividad. La primera carga puede tardar unos segundos.

### Opción 2: Desplegar GRATIS en Railway

1. Sube el proyecto a GitHub
2. Ve a [railway.app](https://railway.app)
3. Click en "Start a New Project"
4. Conecta tu repositorio de GitHub
5. Railway detectará automáticamente Node.js
6. ¡Listo! Tu juego estará disponible

### Opción 3: Ejecutar Localmente

1. **Instala Node.js** (si no lo tienes): [nodejs.org](https://nodejs.org)

2. **Descarga el proyecto** y abre una terminal en la carpeta

3. **Instala las dependencias:**
   ```bash
   npm install
   ```

4. **Inicia el servidor:**
   ```bash
   npm start
   ```

5. **Abre tu navegador** en `http://localhost:3000`

6. **Para que otros se conecten:**
   - Si estás en la misma red WiFi, comparte tu IP local (ejemplo: `http://192.168.1.5:3000`)
   - Para jugar con amigos fuera de tu red, necesitas usar ngrok o desplegarlo en Render

## 📁 Estructura del Proyecto

```
mafia-game/
│
├── server.js           # Servidor Node.js con Socket.io
├── package.json        # Dependencias del proyecto
├── public/
│   ├── index.html     # HTML del cliente
│   ├── style.css      # Estilos
│   └── client.js      # JavaScript del cliente con Socket.io
└── README.md          # Este archivo
```

## 🎮 Características

- ✅ Multijugador en tiempo real
- ✅ Cada jugador ve solo su información
- ✅ Sistema de salas con códigos únicos
- ✅ Asignación automática de roles
- ✅ Sistema de votación
- ✅ Interfaz moderna y responsive
- ✅ Funciona en móviles
- ✅ 100% gratuito para desplegar

## 🛠️ Tecnologías Utilizadas

**Backend:**
- Node.js
- Express
- Socket.io

**Frontend:**
- HTML5
- CSS3
- JavaScript (Vanilla)
- Socket.io Client

## 📝 Cómo Jugar (Una vez desplegado)

1. **El host** crea una sala y obtiene un código (ejemplo: `ABC123`)
2. **Los demás jugadores** ingresan ese código para unirse
3. Cuando hay al menos 6 jugadores, **el host** inicia el juego
4. Cada jugador ve su rol en su propia pantalla
5. Durante la noche, cada rol realiza su acción desde su dispositivo
6. Los resultados se muestran a todos
7. ¡El juego continúa hasta que haya un ganador!

## 🌐 Plataformas Gratuitas Recomendadas

1. **Render** (Recomendado) - Fácil y gratuito
2. **Railway** - Muy simple
3. **Fly.io** - Buena opción
4. **Heroku** - Requiere tarjeta de crédito (pero no cobra)

## 🤝 Contribuciones

Este proyecto fue creado con IA. ¡Siéntete libre de hacer fork y mejorarlo!

## 📄 Licencia

Uso libre para propósitos educativos y recreativos.

---

¡Disfruta del juego! 🎭
