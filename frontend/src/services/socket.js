import { io } from "socket.io-client";

const socket = io( "https://disaster-management-system-chi7.onrender.com", {
  transports: ["websocket"],
});

export default socket;