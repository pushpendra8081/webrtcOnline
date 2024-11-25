const http = require("http");
const socketIo = require("socket.io");

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
  console.log(`${socket.user} (${socket.userType}) connected`);

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
      io.to(calleeSocket).emit("newCall", {
        callerId: socket.user,
        sdpOffer: sdpOffer,
      });
      console.log(`Call request from ${socket.user} to ${calleeId}`);
    } else {
      console.log(`Target ${calleeId} not online`);
    }
  });

  // Handle "answerCall" event
  socket.on("answerCall", (data) => {
    const { callerId, sdpAnswer } = data;
    const callerSocket = users[callerId] || hosts[callerId];

    if (callerSocket) {
      io.to(callerSocket).emit("callAnswered", {
        callee: socket.user,
        sdpAnswer: sdpAnswer,
      });
      console.log(`Call answered from ${socket.user} to ${callerId}`);
    } else {
      console.log(`Target ${callerId} not online`);
    }
  });

  // Handle "IceCandidate" event
  socket.on("IceCandidate", (data) => {
    const { calleeId, iceCandidate } = data;
    const calleeSocket = users[calleeId] || hosts[calleeId];

    if (calleeSocket) {
      io.to(calleeSocket).emit("IceCandidate", {
        sender: socket.user,
        iceCandidate: iceCandidate,
      });
      console.log(`ICE candidate from ${socket.user} to ${calleeId}`);
    } else {
      console.log(`Target ${calleeId} not online`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`${socket.user} disconnected`);

    // Remove from users or hosts
    if (socket.userType === "user") {
      delete users[socket.user];
    } else if (socket.userType === "host") {
      delete hosts[socket.user];
    }
  });
});

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
