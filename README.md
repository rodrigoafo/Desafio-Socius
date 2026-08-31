# Desafío Socius - MVP de reclutamiento

Aplicación web para gestionar búsquedas laborales, candidatos y postulaciones. Permite registrar candidatos con CV, asociarlos a búsquedas, cambiar el estado de sus postulaciones y consultar indicadores básicos.

## Tecnologías

- Backend: Python, Django y Django REST Framework.
- Frontend: React, Vite y Material UI.
- Base de datos: SQLite.

## Requisitos previos

- Python 3.11 o superior.
- Node.js 22 o superior.
- npm.

> En Windows, si utilizas nvm, puedes comprobar la versión con `node -v` y `npm -v`.

## 1. Instalación y ejecución del backend

Desde PowerShell, ubícate en la carpeta raíz del proyecto:

```powershell
cd "C:\ruta\a\Desafio Socius"
```

Crea y activa el entorno virtual:

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
```

Si PowerShell bloquea la activación del entorno, ejecuta una vez en esa terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Instala las dependencias:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Aplica las migraciones de la base de datos:

```powershell
python manage.py migrate
```

Carga los datos de demostración:

```powershell
python manage.py loaddata demo_data
```

Inicia el servidor Django:

```powershell
python manage.py runserver
```

El backend quedará disponible en `http://127.0.0.1:8000/` y la API en `http://127.0.0.1:8000/api/`.

## 2. Instalación y ejecución del frontend

Abre una segunda terminal de PowerShell. Desde la raíz del proyecto, ejecuta:

```powershell
cd frontend
npm install
npm run dev
```

Abre la dirección que Vite muestre en la terminal, normalmente `http://localhost:5173/`.

El frontend redirige automáticamente las solicitudes `/api` y `/media` al backend local, por lo que ambos servidores deben estar ejecutándose durante el desarrollo.

## 3. Verificaciones

Con el entorno virtual activado, ejecuta las pruebas de la API desde la raíz:

```powershell
python manage.py test desafio_api
```

Para validar el frontend, desde la carpeta `frontend` ejecuta:

```powershell
npm run build
npm run lint
```

## Datos de demostración

El fixture `desafio_api/fixtures/demo_data.json` incluye búsquedas, candidatos y postulaciones de ejemplo. Debe cargarse una sola vez sobre una base de datos nueva.

Si ya cargaste los datos y necesitas reiniciar la base local, elimina el archivo `db.sqlite3` y vuelve a ejecutar las migraciones y la carga del fixture. No realices ese paso si quieres conservar tus registros actuales.

## Funcionalidades principales

- Crear, filtrar y editar búsquedas laborales.
- Registrar candidatos, incluyendo teléfono, LinkedIn y CV opcional en PDF.
- Asociar candidatos a búsquedas activas.
- Cambiar el estado de una postulación.
- Consultar el perfil, historial de postulaciones y CV de un candidato.
- Visualizar indicadores y mensajes de carga, éxito o error.
