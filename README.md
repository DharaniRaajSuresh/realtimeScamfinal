# AI Scam Shield (Realtime Scam Detection)

This project is a React-based web application focused on identifying, tracking, or demonstrating real-time AI fraud and scams. It utilizes Agora for live audio/video communication, MongoDB for database management, and charting libraries like Chart.js and Recharts for data visualization and analytics.

The application is divided into a robust FastAPI Python backend and a React/Vite frontend. It offers two distinct views: one for **Users** (with an Elderly Mode for simplified navigation) and one for **Police/Authorities** to track and analyze scam activities.

## 🚀 Features
- **Real-Time Analysis**: Integrates Agora RTC for live calls and websockets for real-time alerts.
- **Voiceprint & Speech-to-Text**: Analyzes audio for potential scams using tools like SpeechBrain.
- **Dual Dashboards**:
  - **User Dashboard**: Call analysis, history, family guardian features, and scam education. Includes an accessibility-focused "Elderly Mode".
  - **Police Dashboard**: Global heatmap, voiceprint analysis, scammer fingerprinting, and case tracking.

## 📁 File Structure & Breakdown

### Frontend (`/src`)
The React frontend handles the UI, state, and routing.

- **`App.jsx` / `main.jsx`**: Application entry points and main routing definitions. Routes direct users to either the Police or User dashboards.
- **`App.css` / `index.css`**: Global styles and CSS variables.

#### User Dashboard (`/src/user`)
- **`UserDashboard.jsx` / `.css`**: Main layout for the user facing side, containing navigation and the elderly mode toggle.
- **`components/`**: Contains reusable UI elements like `TopNav` and `TabNav`.
- **`pages/`**:
  - `Home.jsx`: The main landing page for the user view.
  - `Analyze.jsx`: Interface for real-time call/audio analysis.
  - `History.jsx`: Logs of past calls and scam analysis history.
  - `FamilyGuardian.jsx`: Features for family members to monitor and protect vulnerable relatives.
  - `Learn.jsx`: Educational resources on the latest scam tactics.

#### Police Dashboard (`/src/police`)
- **`PoliceDashboard.jsx` / `.css`**: Layout for the law enforcement dashboard.
- **`components/`**: Navigation tools like `Topbar`, `Sidebar`, and `NavTabs`.
- **`pages/`**:
  - `Overview.jsx`: A high-level view of current scam trends and stats.
  - `Heatmap.jsx`: Geographic visualization of scam origins and targets.
  - `Fingerprint.jsx`: Digital fingerprinting of known scam entities.
  - `Voiceprint.jsx`: Audio analysis and voice matching for scammer identification.
  - `CaseTracker.jsx`: Tool to manage and track ongoing fraud investigations.
  - `Reports.jsx`: Generation of detailed scam incident reports.

### Backend (`/backend`)
The backend is built with FastAPI and handles data processing, voice analysis, and database interactions.

- **`requirements.txt`**: Python dependencies including FastAPI, Pinecone, SpeechBrain, Motor (MongoDB), and Agora SDK.
- **`test_assemblyai.py` / `test_voice_api.py`**: Scripts to test external APIs like AssemblyAI and the voice processing endpoints.
- **`.env`**: Contains sensitive API keys and configuration variables (ignored in Git).

#### Backend App (`/backend/app`)
- **`main.py`**: The FastAPI application entry point. Configures background tasks (Pinecone/Qdrant setup), CORS, and includes all API routers.
- **`api/endpoints/`**:
  - `analyze.py`: Endpoints for generic scam analysis.
  - `agora.py`: Handles Agora token generation and RTC session management.
  - `stt.py`: Speech-to-Text processing.
  - `complaints.py`: Endpoint for submitting and fetching user complaints.
  - `feed.py`: Manages the live scam feed/activity stream.
  - `voice.py`: Core voice processing logic (voiceprints, embeddings).
  - `websocket.py`: Handles live bidirectional communication for real-time alerts.
- **`core/`**: Configuration, security, and shared utilities.
- **`schemas/`**: Pydantic models for data validation and API request/response typing.
- **`services/`**: Business logic, including integrations with external services like Pinecone, database interactions, and voice modeling.

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, React Router, Recharts, Chart.js, Lucide React
- **Backend**: FastAPI, Python, Uvicorn, Motor (MongoDB Async), Pinecone, Qdrant
- **Machine Learning & Audio**: SpeechBrain, Pyannote, Librosa
- **Real-Time Comms**: Agora RTC SDK, WebSockets
