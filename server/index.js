// index.js
const { Server } = require("socket.io");

const io = new Server(8000, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);

  socket.on("room:join", (data) => {
    const { email, room } = data;

    // join room
    socket.join(room);

    // save mappings
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);

    // get current members in the room (excluding this socket)
    const clientsInRoom = io.sockets.adapter.rooms.get(room) || new Set();
    const otherSocketIds = Array.from(clientsInRoom).filter((id) => id !== socket.id);

    // send list of existing users to the joining user so they can create offers
    io.to(socket.id).emit("room:all-users", { users: otherSocketIds });

    // notify everyone (including the joining user) that a user joined
    io.to(room).emit("user:joined", { email, id: socket.id });

    // confirmation back to the joining socket
    io.to(socket.id).emit("room:join", data);
  });

  // Relays an offer from A to B
  socket.on("offer", ({ to, from, offer }) => {
    io.to(to).emit("offer", { from, offer });
  });

  // Relays an answer from B to A
  socket.on("answer", ({ to, from, answer }) => {
    io.to(to).emit("answer", { from, answer });
  });

  // Relays ICE candidates
  socket.on("ice-candidate", ({ to, from, candidate }) => {
    io.to(to).emit("ice-candidate", { from, candidate });
  });

  // When a user ends their outgoing stream / leaves the call
  socket.on("end-call", ({ room }) => {
    // notify others in the room that this user ended the call
    io.to(room).emit("user:ended", { id: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected", socket.id);
    const email = socketidToEmailMap.get(socket.id);
    if (email) {
      emailToSocketIdMap.delete(email);
    }
    socketidToEmailMap.delete(socket.id);

    // broadcast to all rooms this socket was in that it left
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((room) => {
      io.to(room).emit("user:left", { id: socket.id });
    });
  });
});

console.log("Socket.IO server running on port 8000");
