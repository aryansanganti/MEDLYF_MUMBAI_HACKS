# Medlyf - Intelligent Healthcare Orchestration System

Medlyf is an AI-powered healthcare resource management and orchestration platform designed to optimize ICU operations, predict patient demand, and coordinate critical resources across hospital networks. It leverages multi-agent AI systems to save lives through real-time intelligence and automated logistics.

## 🚀 Project Description

Medlyf addresses the critical challenge of resource allocation in healthcare, particularly during high-demand scenarios like outbreaks. It serves hospital administrators, emergency response teams, and logistics coordinators by providing a unified dashboard for:
- **Real-time Monitoring**: ICU bed occupancy, oxygen supply, and patient flow.
- **AI Predictions**: Forecasting demand for beds and oxygen using machine learning.
- **Automated Alerts**: Detecting outbreaks and critical shortages, sending instant WhatsApp notifications.
- **Resource Optimization**: Intelligent agents that allocate resources and manage logistics.

**Unique Features:**
- **Multi-Agent AI**: Six specialized agents for data ingestion, forecasting, optimization, logistics, communication, and learning.
- **3D Visualizations**: Interactive DNA helix and data visualizations for an engaging user experience.
- **WhatsApp Integration**: Instant alerts for critical events and outbreaks.
- **Generative AI Reports**: Automated PDF reports with AI-generated executive summaries using Google Gemini.

## 📸 Features

- **Real-Time Dashboard**: Live tracking of ICU capacity, oxygen levels, and active patients.
- **AI-Powered Forecasting**: Predicts resource needs to prevent shortages.
- **Outbreak Detection**: Algorithms to detect sudden spikes in admissions and alert authorities.
- **Logistics Management**: Automated job creation and vehicle routing for resource delivery.
- **Smart Alerts**: Twilio-integrated WhatsApp notifications for critical system states.
- **Comprehensive Reports**: Generate and download detailed PDF reports with AI insights.
- **Secure Authentication**: Role-based access control for hospital staff.

## 🤖 Autonomous Agents

Medlyf employs a sophisticated multi-agent system to handle complex tasks:

1.  **Data Ingestion Agent**: Continuously collects and validates real-time data from hospital systems, IoT devices, and health management platforms.
2.  **Forecasting Agent**: Predicts ICU bed demand, oxygen consumption, and patient flow patterns using advanced ML models.
3.  **Resource Optimization Agent**: Allocates oxygen, beds, ventilators, and staff efficiently based on real-time demand and capacity.
4.  **Logistics Coordination Agent**: Manages supply chain, coordinates deliveries, and optimizes distribution of critical resources.
5.  **Communication Agent**: Generates multilingual alerts, advisories, and notifications in local languages for accessibility.
6.  **Feedback Learning Agent**: Continuously learns from outcomes, improves predictions, and adapts strategies based on historical data.

## 🛠 Tech Stack

### Frontend
- **React.js**: Component-based UI architecture.
- **Tailwind CSS**: Utility-first styling for a modern, responsive design.
- **Vite**: Fast build tool and development server.
- **Lucide React**: Beautiful, consistent icons.
- **Socket.io Client**: Real-time updates for jobs and alerts.

### Backend
- **Node.js & Express.js**: Robust server-side runtime and API framework.
- **MongoDB & Mongoose**: Flexible NoSQL database for storing patient and hospital data.
- **Socket.io**: Real-time bidirectional communication.
- **Twilio API**: WhatsApp messaging service for alerts.
- **Google Gemini AI**: Generative AI for report summarization and insights.
- **PDFKit**: Server-side PDF generation.

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas connection string)
- Git

### Steps

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/medlyf.git
    cd medlyf
    ```

2.  **Server Setup**
    ```bash
    cd server
    npm install
    ```

3.  **Client Setup**
    ```bash
    cd ../client
    npm install
    ```

4.  **Environment Configuration**
    Create a `.env` file in the `server` directory with the following variables:
    ```env
    # MongoDB Connection
    MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/medlyf

    # Twilio Configuration (for alerts)
    TWILIO_ACCOUNT_SID=your_twilio_sid
    TWILIO_AUTH_TOKEN=your_twilio_auth_token
    TWILIO_PHONE_NUMBER=whatsapp:+14155238886
    RECIPIENT_PHONE_NUMBER=whatsapp:+91xxxxxxxxxx

    # Google Gemini API Key
    GEMINI_API_KEY=your_gemini_api_key

    # Server Port
    PORT=5002
    
    # Frontend URL
    FRONTEND_URL=http://localhost:5173
    ```

5.  **Run the Application**
    
    Start the Backend Server:
    ```bash
    cd server
    npm start
    ```
    
    Start the Frontend Client:
    ```bash
    cd client
    npm run dev
    ```

## 📂 Folder Structure

```
/medlyf
├── /client                 # React Frontend
│   ├── /src
│   │   ├── /components     # Reusable UI components (DNAHelix, Layout, etc.)
│   │   ├── /pages          # Application pages (Index, Dashboard, Reports)
│   │   ├── /contexts       # React Contexts (AuthContext)
│   │   └── global.css      # Global styles and Tailwind directives
│   └── package.json
│
└── /server                 # Node.js Backend
    ├── /models             # Mongoose Schemas (Patient, Job, Hospital)
    ├── /routes             # API Routes (hospitals, reports, patients)
    ├── /services           # Business Logic (geminiService, scheduler)
    ├── index.js            # Server entry point
    └── package.json
```

## 📡 API Documentation

### Patients & Alerts
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/patients` | Fetch all patients and current alert status. |
| `POST` | `/api/add-patient` | Admit a new patient and trigger outbreak checks. |

### Reports
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/reports/data` | Fetch aggregated data for reports. |
| `POST` | `/api/reports/generate-summary` | Generate AI summary using Gemini. |
| `POST` | `/api/reports/download` | Generate and download PDF report. |

### Optimization & Jobs
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/optimization/plan` | Get latest resource optimization plan. |
| `GET` | `/api/jobs` | List all logistics jobs. |
| `POST` | `/api/jobs` | Create a new logistics job. |

## 💡 Usage

1.  **Landing Page**: View the 3D DNA visualization and system overview.
2.  **Dashboard**: Log in to view real-time statistics on beds and oxygen.
3.  **Patient Management**: Add new patients; the system automatically checks for outbreaks.
4.  **Reports**: Go to the Reports section to generate AI-summarized PDFs for hospital administration.
5.  **Alerts**: Configure Twilio to receive WhatsApp alerts when critical thresholds (e.g., low beds, sudden influx) are breached.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👨‍💻 Author

**Mohak Jaiswal** & Team
- [GitHub](https://github.com/yourusername)
- [LinkedIn](https://linkedin.com/in/yourusername)
