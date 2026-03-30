import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";   // ✅ ADD THIS
import CitizenDashboard from "./pages/CitizenDashboard";
import GovCentralDashboard from "./pages/GovCentralDashboard";
import GovEmployeeDashboard from "./pages/GovEmployeeDashboard";
import NGOCommandDashboard from "./pages/NGOCommandDashboard";
import NGOUserDashboard from "./pages/NGOUserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 🔥 FIX MARKER ISSUE (MUST BE TOP LEVEL)
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
/* ===============================
   PRIVATE ROUTE PROTECTION
================================= */
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route path="/" element={<Login />} />

        {/* REGISTER */}
        <Route path="/register" element={<Register />} />

        {/* DASHBOARD (ROLE BASED) */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <RoleBasedDashboard />
            </PrivateRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}

/* ===============================
   ROLE-BASED DASHBOARD SWITCH
================================= */
const RoleBasedDashboard = () => {
  const role = localStorage.getItem("role");

  if (role === "Admin") return <AdminDashboard />;

  if (role === "GOV_ADMIN")
    return <GovCentralDashboard />;

  if (role === "GOV_EMPLOYEE")
    return <GovEmployeeDashboard />;

  if (role === "NGO_ADMIN")
    return <NGOCommandDashboard />;

  if (role === "NGO_USER")
    return <NGOUserDashboard />;

  if (role === "Citizen")
    return <CitizenDashboard />;

  return <Navigate to="/" />;
};

export default App;