# PowerPulse

PowerPulse is a multi-tenant Electrical Operations Management Platform designed to help communities, hostels, apartments, and industries manage electrical assets, maintenance activities, and issue resolution workflows through a centralized system.

The platform provides role-based access control, ticket management, preventive maintenance scheduling, asset tracking, real-time notifications, and an interactive Digital Twin visualization module.

---

## Features

### Multi-Tenant Organization Management

- Create and manage independent organizations
- Organization-level data isolation
- Each organization operates independently
- Dedicated administrator per organization

### Role-Based Access Control (RBAC)

Three user roles are supported:

#### Admin

- Manage users
- Manage assets
- Manage maintenance schedules
- Manage tickets
- Access Digital Twin visualization
- Monitor organization operations

#### Technician

- View assigned tickets
- Start and complete maintenance tasks
- View work history
- Resolve assigned issues

#### Resident

- Raise service requests
- Track ticket status
- Confirm or reopen resolved tickets
- View organization ticket information

---

## Asset Management

- Register electrical assets
- Store asset details and status
- Asset lifecycle tracking
- Asset-linked maintenance records
- Asset-linked tickets

Supported examples include:

- Transformers
- Generators
- Distribution Panels
- Meters
- Substations
- Other custom electrical assets

---

## Ticket Management System

- Create tickets with descriptions and images
- Assign technicians
- Track ticket lifecycle

Ticket workflow:

OPEN → ASSIGNED → IN_PROGRESS → RESOLVED_PENDING_CONFIRMATION → CLOSED

Residents can reopen unresolved issues when necessary.

---

## Maintenance Management

- Create preventive maintenance schedules
- Assign maintenance tasks
- Track maintenance progress
- SLA tracking for maintenance activities
- Overdue task visibility

Maintenance workflow:

SCHEDULED → IN_PROGRESS → COMPLETED

- Technician maintenance workspace
- Maintenance history tracking
- Asset-linked maintenance records

---

## Real-Time Notifications

Socket.IO-based notification system.

Notifications are generated for:

- Ticket assignment
- Ticket status updates
- Ticket reopening
- Maintenance assignment
- Maintenance progress updates
- Maintenance completion

Features:

- Real-time notification delivery
- Notification count badge
- Mark as read
- Mark all as read
- Deep-link navigation to related records

---

## Digital Twin Visualization

Interactive network visualization module for administrators.

Features:

- Add electrical assets to workspace
- Position assets freely
- Connect assets visually
- Visual network representation
- Asset status indicators
- Failure simulation
- Asset information popups

---

## Work History

Technicians can:

- View completed assignments
- Review previously completed maintenance tasks
- Track work history records

---

## Technology Stack

### Frontend

- React
- React Router
- Tailwind CSS
- Framer Motion
- Socket.IO Client
- Recharts
- React Three Fiber
- Drei

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT Authentication

### Database

- MongoDB Atlas

---

## Authentication & Security

- JWT-based authentication
- Protected routes
- Role-based route authorization
- Organization-level data isolation
- Password hashing using bcrypt
- OTP verification flow

---

## Project Structure

```
electrical-operations-platform
│
├── backend
│   ├── controllers
│   ├── middlewares
│   ├── models
│   ├── routes
│   ├── utils
│   └── server.js
│
└── frontend
    ├── src
    │   ├── components
    │   ├── layouts
    │   ├── pages
    │   ├── services
    │   ├── sockets
    │   └── utils
    │
    └── public
```

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd electrical-operations-platform
```

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

Start backend:

```bash
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

Run frontend:

```bash
npm run dev
```

---

## Current Version

### PowerPulse v1

Implemented:

- Multi-tenant organization management
- RBAC
- Asset management
- Ticket management
- Preventive maintenance management
- Real-time notifications
- Digital Twin visualization
- Technician work history

---

## Future Enhancements (Planned)

- AI-assisted operational insights
- Electrical anomaly detection
- Advanced Digital Twin simulation
- Asset health prediction
- Energy consumption analytics
- SLA analytics and performance dashboard
- Community reward system
- Preventive maintenance recommendations

---

## License

This project was developed for learning, portfolio, and demonstration purposes.