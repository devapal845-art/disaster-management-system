import { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import "./Register.css";

const Register = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [ngoList, setNgoList] = useState([]);
  const [govList, setGovList] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    location: "",
    organizationName: "",
    department: "",
    ngoId: "",
    govId: "",

    familyGroupId: "",
    societyGroupId: "",

    currentLocation: null,
    lastLocation: null
  });

  /* ===============================
     FETCH NGO & GOV LIST
  =============================== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const ngos = await API.get("/auth/ngo-admins");
        const govs = await API.get("/auth/gov-admins");
        setNgoList(ngos.data);
        setGovList(govs.data);
      } catch (err) {
        console.log("Fetch error:", err.message);
      }
    };
    fetchData();
  }, []);

  /* ===============================
     GPS LOCATION
  =============================== */
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        setForm((prev) => ({
          ...prev,
          currentLocation: { latitude, longitude },
          lastLocation: {
            type: "Point",
            coordinates: [longitude, latitude]
          }
        }));
      },
      () => setErrorMsg("Please allow location access")
    );
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  /* ===============================
     SUBMIT
  =============================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    /* 🔴 VALIDATION */
    if (!form.name || !form.email || !form.password || !form.phone || !form.city) {
      setErrorMsg("Please fill all required fields");
      setLoading(false);
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setErrorMsg("Invalid email");
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setErrorMsg("Phone number must be 10 digits");
      setLoading(false);
      return;
    }

    if (!form.currentLocation) {
      setErrorMsg("Enable location access");
      setLoading(false);
      return;
    }

    if (role === "Citizen" && !form.location) {
      setErrorMsg("Location is required");
      setLoading(false);
      return;
    }

    if (role === "NGO_USER" && (!form.organizationName || !form.ngoId)) {
      setErrorMsg("NGO details required");
      setLoading(false);
      return;
    }

    if (role === "GOV_EMPLOYEE" && (!form.department || !form.govId)) {
      setErrorMsg("Government details required");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role,
        city: form.city,

        ...(role === "Citizen" && {
          location: form.location,
          familyGroupId: form.familyGroupId,
          societyGroupId: form.societyGroupId
        }),

        ...(role === "NGO_USER" && {
          ngoId: form.ngoId,
          organizationName: form.organizationName
        }),

        ...(role === "GOV_EMPLOYEE" && {
          govId: form.govId,
          department: form.department
        }),

        currentLocation: form.currentLocation,
        lastLocation: form.lastLocation
      };

      await API.post("/auth/register", payload);

      navigate("/");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Registration Failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">

        <h2>Create Account</h2>

        {/* ROLE SELECT */}
        {step === 1 && (
          <div className="role-grid">
            <div className="role-card" onClick={() => handleRoleSelect("Citizen")}>
              🧍 Citizen
            </div>
            <div className="role-card" onClick={() => handleRoleSelect("NGO_USER")}>
              🤝 NGO User
            </div>
            <div className="role-card" onClick={() => handleRoleSelect("GOV_EMPLOYEE")}>
              🏛 Government
            </div>
          </div>
        )}

        {/* FORM */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>

            <input name="name" placeholder="Full Name" onChange={handleChange} required />
            <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
            <input name="phone" placeholder="Phone Number" onChange={handleChange} required />
            <input name="city" placeholder="City" onChange={handleChange} required />

            {/* CITIZEN */}
            {role === "Citizen" && (
              <>
                <input
                  name="location"
                  placeholder="Your Location"
                  onChange={handleChange}
                  required
                />

                <select name="familyGroupId" onChange={handleChange}>
                  <option value="">Family Group (Optional)</option>
                  <option value="FAM-001">FAM-001</option>
                  <option value="FAM-002">FAM-002</option>
                </select>

                <select name="societyGroupId" onChange={handleChange}>
                  <option value="">Society Group (Optional)</option>
                  <option value="SOC-001">SOC-001</option>
                  <option value="SOC-002">SOC-002</option>
                </select>
              </>
            )}

            {/* NGO */}
            {role === "NGO_USER" && (
              <>
                <input
                  name="organizationName"
                  placeholder="Organization Name"
                  onChange={handleChange}
                  required
                />

                <select name="ngoId" onChange={handleChange} required>
                  <option value="">Select NGO</option>
                  {ngoList.map((ngo) => (
                    <option key={ngo._id} value={ngo._id}>
                      {ngo.organizationName}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* GOV */}
            {role === "GOV_EMPLOYEE" && (
              <>
                <input
                  name="department"
                  placeholder="Department"
                  onChange={handleChange}
                  required
                />

                <select name="govId" onChange={handleChange} required>
                  <option value="">Select Government Admin</option>
                  {govList.map((gov) => (
                    <option key={gov._id} value={gov._id}>
                      {gov.department} - {gov.city}
                    </option>
                  ))}
                </select>
              </>
            )}

            {errorMsg && <p className="error">{errorMsg}</p>}

            <button disabled={loading}>
              {loading ? "Creating..." : "Register"}
            </button>

            <button type="button" onClick={() => setStep(1)}>
              ← Back
            </button>

          </form>
        )}

        <Link to="/">Already have an account? Login</Link>
      </div>
    </div>
  );
};

export default Register;