import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = axios.create({
  baseURL: "http://10.14.173.170:5000/api",
});

/* ================= REQUEST INTERCEPTOR ================= */

API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");

    // ✅ Always ensure headers exist
    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      "AUTH HEADER:",
      token ? "Bearer TOKEN ✅" : "undefined ❌"
    );

    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE INTERCEPTOR ================= */

API.interceptors.response.use(
  (res) => res,
  async (error) => {

    if (error?.response?.status === 401) {
      console.log("🚨 TOKEN EXPIRED → AUTO LOGOUT");

      await AsyncStorage.clear();

      // ⚠️ DO NOT navigate here (causes bugs)
      // navigation should happen in screen
    }

    return Promise.reject(error);
  }
);

export default API;