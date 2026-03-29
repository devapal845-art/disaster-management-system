import { io } from "socket.io-client";

const socket = io("https://disaster-management-system-chi7.onrender.com", {
  withCredentials: true,
  transports: ["websocket", "polling"], // ✅ allow fallback
});

export default socket;