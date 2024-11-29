const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");

// Get the port from the environment variable or use 5000 as default
const port = process.env.PORT || 5000;

// Create the HTTP server
const server = http.createServer();

// Initialize socket.io with CORS support
const IO = socketIo(server, {
  cors: {
    origin: "*", // Replace "*" with your client domain for better security in production
    methods: ["GET", "POST"],
  },
});

// Log file path
const logFilePath = path.join(__dirname, "server.log");

// Utility function to log messages
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  // Log to console
  console.log(logEntry.trim());

  // Append to log file
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) console.error("Failed to write to log file", err);
  });
}

// Store active user and host connections
let users = {};
let hosts = {};

// Middleware to attach user information from handshake query
IO.use((socket, next) => {
  if (socket.handshake.query) {
    const callerId = socket.handshake.query.callerId;
    const userType = socket.handshake.query.userType; // 'user' or 'host'
    socket.user = callerId;
    socket.userType = userType;
    next();
  }
});

// Handle socket.io events
IO.on("connection", (socket) => {
  logMessage(`${socket.user} (${socket.userType}) connected`);

  // Add the socket to the correct group (user or host)
  if (socket.userType === "user") {
    users[socket.user] = socket.id;
  } else if (socket.userType === "host") {
    hosts[socket.user] = socket.id;
  }

  // Handle "makeCall" event
  socket.on("makeCall", (data) => {
    const { calleeId, sdpOffer } = data;
    const calleeSocket = users[calleeId] || hosts[calleeId];

    if (calleeSocket) {
      IO.to(calleeSocket).emit("newCall", {
        callerId: socket.user,
        sdpOffer: sdpOffer,
      });
      logMessage(`Call request from ${socket.user} to ${calleeId}`);
    } else {
      logMessage(`Target ${calleeId} not online`);
    }
  });

  // Handle "answerCall" event
  socket.on("answerCall", (data) => {
    const { callerId, sdpAnswer } = data;
    const callerSocket = users[callerId] || hosts[callerId];

    if (callerSocket) {
      IO.to(callerSocket).emit("callAnswered", {
        callee: socket.user,
        sdpAnswer: sdpAnswer,
      });
      logMessage(`Call answered from ${socket.user} to ${callerId}`);
    } else {
      logMessage(`Target ${callerId} not online`);
    }
  });

  // Handle "IceCandidate" event
  socket.on("IceCandidate", (data) => {
    const { calleeId, iceCandidate } = data;
    const calleeSocket = users[calleeId] || hosts[calleeId];

    if (calleeSocket) {
      IO.to(calleeSocket).emit("IceCandidate", {
        sender: socket.user,
        iceCandidate: iceCandidate,
      });
      logMessage(`ICE candidate from ${socket.user} to ${calleeId}`);
    } else {
      logMessage(`Target ${calleeId} not online`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    logMessage(`${socket.user} disconnected`);

    // Remove from users or hosts
    if (socket.userType === "user") {
      delete users[socket.user];
    } else if (socket.userType === "host") {
      delete hosts[socket.user];
    }
  });
});

// Start the server
server.listen(port, "0.0.0.0", () => {
  logMessage(`Server is running on port ${port}`);
});
