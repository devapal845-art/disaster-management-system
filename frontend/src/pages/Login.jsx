
import { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

 const handleLogin = async (e) => {
  e.preventDefault();
  setErrorMsg("");
  setLoading(true);

  try {
    const res = await API.post("/auth/login", { email, password });

    const { token, user } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("role", user.role);
    localStorage.setItem("name", user.name);
    localStorage.setItem("userId", user.id);
    localStorage.setItem("email", user.email || "");
    localStorage.setItem("city", user.city || "");
    localStorage.setItem("ngoId", user.ngoId || "");
    console.log("✅ LOGIN SUCCESS:", user);

    // ✅ SINGLE ENTRY POINT
    navigate("/dashboard");

  } catch (error) {
    console.error("Login Error:", error);
    setErrorMsg("Invalid email or password");
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">🔐 Disaster Intelligence</h2>
        <p className="login-subtitle">Secure Access Portal</p>

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errorMsg && <div className="login-error">{errorMsg}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="register-link">
          <p>
            Don't have an account?{" "}
            <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
