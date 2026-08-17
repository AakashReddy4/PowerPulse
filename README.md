# PowerPulse

PowerPulse is a multi-tenant Electrical Operations Management Platform designed to help communities, hostels, apartments, and industries manage electrical assets, maintenance activities, and issue resolution workflows through a centralized system.

The platform provides role-based access control, ticket management, preventive maintenance scheduling, asset tracking, real-time notifications, and an interactive Digital Twin visualization module.

---

## Live Demo

### Application

https://powerpulse-five.vercel.app

### Backend API

https://powerpulse-6ixq.onrender.com

> **Note:** The backend is deployed on a free hosting tier and may enter an inactive state after a period of inactivity. When the application is accessed after inactivity, PowerPulse detects the backend startup process and displays a loading message while the service becomes available.

---

## Overview

PowerPulse provides a centralized platform for managing electrical operations across multiple independent organizations.

The system separates users by organization and role, allowing administrators, technicians, and residents to interact with electrical assets, maintenance activities, and service tickets according to their responsibilities.

The platform combines:

- Multi-tenant organization management
- Role-based access control
- Electrical asset management
- Service ticket management
- Preventive maintenance
- Maintenance SLA tracking
- Real-time notifications
- Technician work history
- Interactive Digital Twin visualization
- OTP-based authentication

---

# Features

## Multi-Tenant Organization Management

PowerPulse supports multiple independent organizations within the same platform.

Features include:

- Create and manage organizations
- Organization-level data isolation
- Independent organization operations
- Dedicated administrator for each organization
- Organization-specific users, assets, tickets, and maintenance records

Each organization's operational data remains associated with its respective organization.

---

## Role-Based Access Control

PowerPulse provides three primary user roles.

### Admin

Administrators can:

- Manage users
- Manage electrical assets
- Manage maintenance schedules
- Manage tickets
- Assign technicians
- Monitor organization operations
- Access the Digital Twin
- View operational dashboards

### Technician

Technicians can:

- View assigned tickets
- Start assigned work
- Complete maintenance tasks
- Resolve assigned issues
- View work history
- Access technician maintenance workspace

### Resident

Residents can:

- Create service requests
- Submit ticket descriptions and images
- Track ticket status
- View their requests
- Confirm resolved issues
- Reopen closed tickets when further resolution is required
- Receive ticket-related notifications

---

# Asset Management

PowerPulse provides centralized management of electrical assets.

Features include:

- Register electrical assets
- Store asset details
- Track asset status
- Maintain asset lifecycle information
- Link assets with maintenance records
- Link assets with service tickets

Supported asset examples include:

- Transformers
- Generators
- Distribution Panels
- Meters
- Substations
- Other custom electrical assets

---

# Ticket Management System

The ticket management system provides a structured workflow for reporting, assigning, resolving, and closing electrical service issues.

Features include:

- Create service tickets
- Add descriptions
- Upload ticket images
- Assign technicians
- Track ticket status
- Maintain ticket history
- Update ticket status
- Confirm resolved issues
- Reopen closed tickets
- Generate ticket-related notifications

## Ticket Workflow

```text
OPEN
  ↓
ASSIGNED
  ↓
IN_PROGRESS
  ↓
RESOLVED_PENDING_CONFIRMATION
  ↓
CLOSED
  ↓
REOPENED
  ↓
IN_PROGRESS
```

A closed ticket can be reopened when the reported issue requires further resolution.

Reopened tickets return to the active work process and can be continued by the assigned technician.

---

# Maintenance Management

PowerPulse supports preventive maintenance management for electrical assets.

Features include:

- Create preventive maintenance schedules
- Assign maintenance tasks
- Track maintenance progress
- Track maintenance SLAs
- Identify overdue maintenance tasks
- Access technician maintenance workspace
- Maintain maintenance history
- Link maintenance records with assets

## Maintenance Workflow

```text
SCHEDULED
    ↓
IN_PROGRESS
    ↓
COMPLETED
```

Maintenance records can be associated with specific electrical assets to maintain operational history.

---

# Real-Time Notifications

PowerPulse uses Socket.IO to provide real-time notification delivery.

Notifications can be generated for events such as:

- Ticket assignment
- Ticket status updates
- Ticket reopening
- Maintenance assignment
- Maintenance progress updates
- Maintenance completion

## Notification Features

- Real-time notification delivery
- Notification count badge
- Mark individual notifications as read
- Mark all notifications as read
- Deep-link navigation to related records
- Persistent notification records

---

# Digital Twin Visualization

PowerPulse includes an interactive Digital Twin visualization module for administrators.

The module provides a visual representation of electrical assets and their relationships.

Features include:

- Add electrical assets to the workspace
- Position assets freely
- Connect assets visually
- Visualize electrical networks
- Display asset status indicators
- Simulate asset failures
- View asset information through interactive popups

The Digital Twin provides an interactive visual layer for understanding the organization's electrical asset network.

---

# Work History

PowerPulse provides technicians with access to historical work information.

Technicians can:

- View completed assignments
- Review completed maintenance tasks
- Review previous work records
- Track historical maintenance activity

This provides technicians with a centralized view of previously completed operational work.

---

# Authentication & Security

PowerPulse implements authentication and authorization mechanisms to protect application resources.

Security features include:

- JWT-based authentication
- Access and refresh token handling
- Protected routes
- Role-based route authorization
- Organization-level data isolation
- Password hashing using bcrypt
- OTP verification flow
- API rate limiting
- Protected backend endpoints
- File upload handling

Sensitive configuration values are stored using environment variables and are excluded from version control.

---

# Technology Stack

## Frontend

- React
- Vite
- React Router
- Tailwind CSS
- Framer Motion
- Socket.IO Client
- Recharts
- React Three Fiber
- Drei

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT Authentication
- Cloudinary
- Express Rate Limit

## Database

- MongoDB Atlas

## File & Media Storage

- Cloudinary

## Source Control

- Git
- GitHub

## Deployment

- Vercel — Frontend
- Render — Backend
- MongoDB Atlas — Database

---

# System Architecture

```text
                         GitHub
                           │
                           │
                    PowerPulse Repository
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
          Vercel                       Render
        Frontend                      Backend
             │                           │
             │                     Node.js / Express
             │                           │
             │                     Socket.IO Server
             │                           │
             │                     REST API Routes
             │                           │
             └──────────────┬────────────┘
                            │
                            │ HTTPS / API
                            │
                            ▼
                     MongoDB Atlas
                            │
                            ▼
                     Application Data
```

---

# Project Structure

```text
PowerPulse
│
├── backend
│   ├── config
│   │   └── cloudinary.js
│   │
│   ├── controllers
│   │   ├── anomalyController.js
│   │   ├── assetController.js
│   │   ├── dashboardController.js
│   │   ├── digitalTwinController.js
│   │   ├── maintenanceController.js
│   │   ├── notificationController.js
│   │   ├── organizationController.js
│   │   ├── ticketController.js
│   │   └── userController.js
│   │
│   ├── middlewares
│   │   ├── authMiddleware.js
│   │   ├── rateLimiter.js
│   │   └── uploadMiddleware.js
│   │
│   ├── models
│   │   ├── Asset.js
│   │   ├── Maintenance.js
│   │   ├── Notification.js
│   │   ├── Organization.js
│   │   ├── Ticket.js
│   │   ├── TwinConnection.js
│   │   └── User.js
│   │
│   ├── routes
│   │   ├── anomalyRoutes.js
│   │   ├── assetRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── digitalTwinRoutes.js
│   │   ├── maintenanceRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── organizationRoutes.js
│   │   ├── ticketRoutes.js
│   │   └── userRoutes.js
│   │
│   ├── scripts
│   │   └── seedData.js
│   │
│   ├── utils
│   │   ├── createNotification.js
│   │   └── mailer.js
│   │
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend
│   ├── public
│   │   └── vite.svg
│   │
│   ├── src
│   │   ├── api
│   │   │   └── auth.js
│   │   │
│   │   ├── assets
│   │   │   └── logo.svg
│   │   │
│   │   ├── components
│   │   │   ├── AppTopbar.jsx
│   │   │   ├── BackendStatus.jsx
│   │   │   ├── GlassPanel.jsx
│   │   │   ├── GlassSelect.jsx
│   │   │   ├── IconButton.jsx
│   │   │   ├── LandingTopbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── PublicRoute.jsx
│   │   │
│   │   ├── layouts
│   │   │   ├── AuthLayout.jsx
│   │   │   └── MainLayout.jsx
│   │   │
│   │   ├── pages
│   │   │   ├── About.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminTickets.jsx
│   │   │   ├── Assets.jsx
│   │   │   ├── AssignedTickets.jsx
│   │   │   ├── CreateOrganization.jsx
│   │   │   ├── DigitalTwin.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Maintenance.jsx
│   │   │   ├── MyRequests.jsx
│   │   │   ├── Notifications.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ResidentTicketDetails.jsx
│   │   │   ├── TechnicianMaintenance.jsx
│   │   │   ├── Tickets.jsx
│   │   │   ├── Users.jsx
│   │   │   ├── VerifyOTP.jsx
│   │   │   └── WorkHistory.jsx
│   │   │
│   │   ├── utils
│   │   │   └── auth.js
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── config.js
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── index.html
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

---

# Local Installation

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Git
- MongoDB Atlas account
- Cloudinary account

---

## Clone Repository

```bash
git clone https://github.com/AakashReddy4/PowerPulse.git
cd PowerPulse
```

---

# Backend Setup

Navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `backend` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Start the backend:

```bash
npm start
```

The local backend will run on:

```text
http://localhost:5000
```

The backend health endpoint is available at:

```text
http://localhost:5000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

# Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000
```

Run the frontend:

```bash
npm run dev
```

The frontend will be available through the Vite development server.

---

# Environment Variables

The application uses environment variables for sensitive and environment-specific configuration.

## Backend Variables

```text
PORT
MONGO_URI
JWT_SECRET
JWT_REFRESH_SECRET
EMAIL_USER
EMAIL_PASS
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

## Frontend Variables

```text
VITE_API_URL
```

Never commit actual environment variable values or credentials to GitHub.

The project's `.gitignore` excludes:

```text
backend/.env
frontend/.env
backend/node_modules/
frontend/node_modules/
frontend/dist/
```

---

# Production Deployment

PowerPulse uses a separate frontend and backend deployment architecture.

## Frontend

The React/Vite frontend is deployed on Vercel.

Production application:

```text
https://powerpulse-five.vercel.app
```

The production frontend communicates with the backend through:

```text
VITE_API_URL=https://powerpulse-6ixq.onrender.com
```

---

## Backend

The Node.js/Express backend is deployed on Render.

Production API:

```text
https://powerpulse-6ixq.onrender.com
```

Backend health endpoint:

```text
https://powerpulse-6ixq.onrender.com/health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

## Backend Startup Handling

The backend uses a free hosting tier and may become inactive after a period without requests.

PowerPulse includes a frontend backend-status layer that:

1. Checks the backend health endpoint.
2. Detects when the backend is unavailable or starting.
3. Displays a "Waking up PowerPulse" message when startup takes longer than expected.
4. Automatically retries the health check.
5. Removes the loading layer once the backend becomes available.

This provides feedback to users while the backend service starts after inactivity.

---

# API Overview

The backend provides REST API routes for the main application modules:

```text
/api/users
/api/tickets
/api/dashboard
/api/notifications
/api/assets
/api/maintenance
/api/organizations
/api/anomalies
/api/digital-twin
```

The backend also provides:

```text
/health
```

for service health monitoring.

---

# Authentication Flow

PowerPulse uses JWT-based authentication with OTP verification.

The authentication flow includes:

```text
Registration
     ↓
OTP Verification
     ↓
Authentication
     ↓
JWT-based Access
     ↓
Protected Routes
```

Role-based authorization is applied to protected frontend routes and backend resources.

---

# Notification Architecture

PowerPulse uses Socket.IO for real-time communication.

The general notification flow is:

```text
User Action
     ↓
Backend Controller
     ↓
Notification Created
     ↓
Socket.IO Event
     ↓
Connected User
     ↓
Real-Time Notification
```

Notifications are also persisted so users can access notification history.

---

# Ticket Workflow

The ticket workflow separates the lifecycle of a service request into multiple operational stages.

```text
OPEN
  │
  ▼
ASSIGNED
  │
  ▼
IN_PROGRESS
  │
  ▼
RESOLVED_PENDING_CONFIRMATION
  │
  ▼
CLOSED
  │
  ▼
REOPENED
  │
  ▼
IN_PROGRESS
```

The workflow ensures that assigned technicians can manage active work while residents can confirm resolved issues and reopen closed tickets when necessary.

---

# Maintenance Workflow

Maintenance activities follow a dedicated lifecycle:

```text
SCHEDULED
     ↓
IN_PROGRESS
     ↓
COMPLETED
```

Maintenance records can be linked with electrical assets, allowing maintenance history to be tracked alongside asset information.

---

# Current Version

## PowerPulse v1.0

The current V1 implementation includes:

- Multi-tenant organization management
- Organization-level data isolation
- Role-based access control
- Admin operations dashboard
- User management
- Electrical asset management
- Asset-linked tickets
- Asset-linked maintenance
- Service ticket management
- Technician assignment
- Ticket status workflow
- Ticket reopening workflow
- Preventive maintenance management
- Maintenance SLA tracking
- Overdue maintenance visibility
- Technician maintenance workspace
- Technician work history
- Real-time notifications
- Notification history
- OTP-based authentication
- JWT-based authentication
- Protected routes
- API rate limiting
- Image upload support
- Cloudinary integration
- Interactive Digital Twin visualization
- Asset connections and network visualization
- Asset failure simulation
- Production frontend deployment
- Production backend deployment
- Backend health monitoring
- Backend wake-up handling

---

# Future Enhancements

The following capabilities are planned for future versions and are not considered completed V1 features:

- AI-assisted operational insights
- Electrical anomaly detection
- Advanced Digital Twin simulation
- Asset health prediction
- Energy consumption analytics
- SLA analytics and performance dashboards
- Community reward system
- Preventive maintenance recommendations

---

# Versioning

The initial production release is tagged as:

```text
v1.0
```

Git tags are used to identify major project releases and provide stable reference points for the project history.

---

# Development Notes

PowerPulse is structured as a monorepository containing separate frontend and backend applications.

```text
PowerPulse
    │
    ├── frontend
    │
    └── backend
```

The frontend and backend can be developed independently during local development and are deployed as separate services in production.

---

# License

This project was developed for learning, portfolio, and demonstration purposes.