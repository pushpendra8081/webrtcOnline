let port = process.env.PORT || 5000;

let IO = require("socket.io")(port, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

IO.use((socket, next) => {
  if (socket.handshake.query) {
    socket.user = {
      callerId: socket.handshake.query.callerId,
    };
    next();
  } else {
    next(new Error("Invalid handshake query"));
  }
});
IO.use((socket, next) => {
  if (socket.handshake.query) {
    socket.userCall = {
      callType: socket.handshake.query.callType,
    };
    next();
  } else {
    next(new Error("Invalid handshake query"));
  }
});

IO.on("connection", (socket) => {
  console.log(socket.user, "Connected");
  socket.join(socket.user.callerId);


  socket.on("makeCall", (data) => {
    let calleeId = data.calleeId;
    let sdpOffer = data.sdpOffer;


    console.log("Received data in makeCall:", data);

    let callType = data.callType || socket.userCall.callType;
   

    socket.to(calleeId).emit("newCall", {
      callerId: socket.user.callerId,
      sdpOffer: sdpOffer,
      callType: callType,
    });
  });

  socket.on("answerCall", (data) => {
    let callerId = data.callerId;
    let sdpAnswer = data.sdpAnswer;

    socket.to(callerId).emit("callAnswered", {
      callee: socket.user.callType,
      sdpAnswer: sdpAnswer,
    });
  });

  socket.on("IceCandidate", (data) => {
    let calleeId = data.calleeId;
    let iceCandidate = data.iceCandidate;

    socket.to(calleeId).emit("IceCandidate", {
      sender: socket.user.callerId,
      iceCandidate: iceCandidate,
    });
  });
});
