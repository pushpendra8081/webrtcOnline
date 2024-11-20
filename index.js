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

// Middleware to attach user information from handshake query
IO.use((socket, next) => {
  if (socket.handshake.query) {
    const callerId = socket.handshake.query.callerId;
    socket.user = callerId;
    next();
  }
});

// Handle socket.io events
IO.on("connection", (socket) => {
  console.log(`${socket.user} Connected`);
  socket.join(socket.user);

  // Handle "makeCall" event
  socket.on("makeCall", (data) => {
    const { calleeId, sdpOffer } = data;
    socket.to(calleeId).emit("newCall", {
      callerId: socket.user,
      sdpOffer: sdpOffer,
    });
  });

  // Handle "answerCall" event
  socket.on("answerCall", (data) => {
    const { callerId, sdpAnswer } = data;
    socket.to(callerId).emit("callAnswered", {
      callee: socket.user,
      sdpAnswer: sdpAnswer,
    });
  });

  // Handle "IceCandidate" event
  socket.on("IceCandidate", (data) => {
    const { calleeId, iceCandidate } = data;
    socket.to(calleeId).emit("IceCandidate", {
      sender: socket.user,
      iceCandidate: iceCandidate,
    });
  });

  // Log disconnection
  socket.on("disconnect", () => {
    console.log(`${socket.user} Disconnected`);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
