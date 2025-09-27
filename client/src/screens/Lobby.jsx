import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import "./Lobby.css";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1 className="lobby-title">Join a Room</h1>
        <form onSubmit={handleSubmitForm} className="lobby-form">
          <label htmlFor="email">Email ID</label>
          <input
            type="email"
            id="email"
            value={email}
            placeholder="Enter your email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="room">Room Number</label>
          <input
            type="text"
            id="room"
            value={room}
            placeholder="Enter room code"
            onChange={(e) => setRoom(e.target.value)}
          />
          <button className="btn">Join</button>
        </form>
      </div>
    </div>
  );
};

export default LobbyScreen;
