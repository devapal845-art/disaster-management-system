import axios from "axios";

const API = axios.create({
  baseURL: "https://disaster-management-system-chi7.onrender.com/api"
});

// 🔥 AUTO ATTACH TOKEN
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;