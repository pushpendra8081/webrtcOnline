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
    const userId = socket.handshake.query.userId; // Change `callerId` to `userId`
    socket.user = userId;
    next();
  }
});

// Handle socket.io events
IO.on("connection", (socket) => {
  console.log(`${socket.user} Connected`);
  socket.join(socket.user);

  // Handle "makeCall" event
  socket.on("makeCall", (data) => {
    const { hostId, sdpOffer } = data; // Change `calleeId` to `hostId`
    if (!hostId) {
      socket.emit("error", { message: "Host ID is required." });
      return;
    }

    socket.to(hostId).emit("newCall", {
      userId: socket.user, // Change `callerId` to `userId`
      sdpOffer: sdpOffer,
    });
  });

  // Handle "answerCall" event
  socket.on("answerCall", (data) => {
    const { userId, sdpAnswer } = data; // Change `callerId` to `userId`
    if (!userId) {
      socket.emit("error", { message: "User ID is required." });
      return;
    }

    socket.to(userId).emit("callAnswered", {
      hostId: socket.user, // Change `callee` to `hostId`
      sdpAnswer: sdpAnswer,
    });
  });

  // Handle "IceCandidate" event
  socket.on("IceCandidate", (data) => {
    const { recipientId, iceCandidate } = data; // Generic naming
    if (!recipientId) {
      socket.emit("error", { message: "Recipient ID is required." });
      return;
    }

    socket.to(recipientId).emit("IceCandidate", {
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
server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
