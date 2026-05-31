import { Routes, Route } from "react-router-dom"
import { useEffect } from "react"




// Pages
import LandingPage from "./pages/LandingPage"
import Login from "./pages/Login"
import Register from "./pages/Register"
import VerifyOTP from "./pages/VerifyOTP"
import CreateOrganization from "./pages/CreateOrganization"
import Home from "./pages/Home"
import About from "./pages/About"

import Users from "./pages/Users"
import Assets from "./pages/Assets"
import Maintenance from "./pages/Maintenance"
import Tickets from "./pages/Tickets"
import DigitalTwin from "./pages/DigitalTwin"
import MyRequests from "./pages/MyRequests"
import ResidentTicketDetails from "./pages/ResidentTicketDetails"
import Notifications from "./pages/Notifications"
import AssignedTickets from "./pages/AssignedTickets"
import WorkHistory from "./pages/WorkHistory"
import Profile from "./pages/Profile"
import AdminDashboard from "./pages/AdminDashboard"
import AdminTickets from "./pages/AdminTickets"
import TechnicianMaintenance from "./pages/TechnicianMaintenance.jsx"

// Route Guards
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"

function App() {

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark"
    document.body.className = saved
  }, [])

  return (
    <Routes>

      {/* PUBLIC ROUTES */}
      <Route path="/" element={
        <PublicRoute>
          <LandingPage />
        </PublicRoute>
      } />

      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />

      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />

      {/* OTP (no guard) */}
      <Route path="/verify-otp" element={<VerifyOTP />} />

      {/* PROTECTED ROUTES */}
      <Route path="/create-organization" element={
        <ProtectedRoute>
          <CreateOrganization />
        </ProtectedRoute>
      } />

      <Route path="/home" element={
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      } />
      <Route path="/about" element={<About />} />


      {/*admin */ }
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Users />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assets"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Assets />
          </ProtectedRoute>
        }
      />


      <Route
        path="/digital-twin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DigitalTwin />
          </ProtectedRoute>
        }
      />

      <Route
        path="/maintenance"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Maintenance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/tickets"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminTickets />
          </ProtectedRoute>
        }
      />

      {/*technician */}
      <Route
        path="/assigned-tickets"
        element={
          <ProtectedRoute allowedRoles={["technician"]}>
            <AssignedTickets />
          </ProtectedRoute>
        }
      />

      <Route
        path="/work-history"
        element={
          <ProtectedRoute allowedRoles={["technician"]}>
            <WorkHistory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/technician/maintenance"
        element={
          <ProtectedRoute allowedRoles={["technician"]}>
            <TechnicianMaintenance />
          </ProtectedRoute>
        }
      />

        {/*resident*/}
        <Route
          path="/my-requests"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <MyRequests />
            </ProtectedRoute>
          }
        />

        
      <Route
        path="/tickets"
        element={
          <ProtectedRoute allowedRoles={["resident"]}>
            <Tickets />
          </ProtectedRoute>
        }
      />

        <Route
          path="/ticket/:id"
          element={
            <ProtectedRoute>
              <ResidentTicketDetails />
            </ProtectedRoute>
          }
        />


      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      

    </Routes>
  )
}

export default App
