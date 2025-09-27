// Room.jsx
import React, { useEffect, useCallback, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { useSocket } from "../context/SocketProvider";
import "./Room.css";
import video_off_img from "../images/video-off-img.png";

// Adjust to match the actual fixed navbar height and desired margins
const NAVBAR_HEIGHT = 64; // px
const CALLBAR_HEIGHT = 60; // px

const configuration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
  ],
};

const RoomPage = () => {
  const socket = useSocket();
  const [remoteStreams, setRemoteStreams] = useState({});
  const [myStream, setMyStream] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);

  // UI States
  const [micOn, setMicOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);

  const peersRef = useRef(new Map());

  // -------------------- PeerConnection Setup --------------------
  const createPeerConnection = useCallback(
    (remoteSocketId) => {
      if (peersRef.current.has(remoteSocketId)) {
        return peersRef.current.get(remoteSocketId).pc;
      }

      const pc = new RTCPeerConnection(configuration);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            to: remoteSocketId,
            from: socket.id,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        setRemoteStreams((prev) => ({ ...prev, [remoteSocketId]: stream }));
      };

      peersRef.current.set(remoteSocketId, { pc, tracksAdded: false });
      return pc;
    },
    [socket]
  );

  // -------------------- WebRTC Handlers --------------------
  const handleAllUsers = useCallback(
    async ({ users }) => {
      users.forEach(async (remoteId) => {
        const pc = createPeerConnection(remoteId);

        if (myStream && !peersRef.current.get(remoteId).tracksAdded) {
          for (const track of myStream.getTracks()) {
            pc.addTrack(track, myStream);
          }
          peersRef.current.get(remoteId).tracksAdded = true;
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { to: remoteId, from: socket.id, offer });
      });
    },
    [createPeerConnection, myStream, socket]
  );

  const handleUserJoined = useCallback(
    async ({ id: remoteId }) => {
      const pc = createPeerConnection(remoteId);
      if (myStream && !peersRef.current.get(remoteId).tracksAdded) {
        for (const track of myStream.getTracks()) {
          pc.addTrack(track, myStream);
        }
        peersRef.current.get(remoteId).tracksAdded = true;
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { to: remoteId, from: socket.id, offer });
    },
    [createPeerConnection, myStream, socket]
  );

  const handleOffer = useCallback(
    async ({ from: remoteId, offer }) => {
      const pc = createPeerConnection(remoteId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      if (myStream && !peersRef.current.get(remoteId).tracksAdded) {
        for (const track of myStream.getTracks()) {
          pc.addTrack(track, myStream);
        }
        peersRef.current.get(remoteId).tracksAdded = true;
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { to: remoteId, from: socket.id, answer });
    },
    [createPeerConnection, myStream, socket]
  );

  const handleAnswer = useCallback(async ({ from: remoteId, answer }) => {
    const entry = peersRef.current.get(remoteId);
    if (!entry) return;
    await entry.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const handleRemoteIce = useCallback(async ({ from: remoteId, candidate }) => {
    const entry = peersRef.current.get(remoteId);
    if (!entry) return;
    try {
      await entry.pc.addIceCandidate(candidate);
    } catch (err) {
      console.error("Error adding ice candidate", err);
    }
  }, []);

  const handleUserEnded = useCallback(({ id: remoteId }) => {
    const entry = peersRef.current.get(remoteId);
    if (entry) {
      try {
        entry.pc.close();
      } catch (e) {}
      peersRef.current.delete(remoteId);
    }
    setRemoteStreams((prev) => {
      const copy = { ...prev };
      delete copy[remoteId];
      return copy;
    });
  }, []);

  const handleUserLeft = useCallback(
    ({ id: remoteId }) => {
      handleUserEnded({ id: remoteId });
    },
    [handleUserEnded]
  );

  // -------------------- Socket Events --------------------
  useEffect(() => {
    socket.on("room:all-users", handleAllUsers);
    socket.on("user:joined", handleUserJoined);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleRemoteIce);
    socket.on("user:ended", handleUserEnded);
    socket.on("user:left", handleUserLeft);

    return () => {
      socket.off("room:all-users", handleAllUsers);
      socket.off("user:joined", handleUserJoined);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleRemoteIce);
      socket.off("user:ended", handleUserEnded);
      socket.off("user:left", handleUserLeft);
    };
  }, [
    socket,
    handleAllUsers,
    handleUserJoined,
    handleOffer,
    handleAnswer,
    handleRemoteIce,
    handleUserEnded,
    handleUserLeft,
  ]);

  // -------------------- Media Handling --------------------
  const handleGetMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
      stream.getVideoTracks().forEach((t) => (t.enabled = videoOn));

      setMyStream(stream);

      peersRef.current.forEach((entry) => {
        if (!entry.tracksAdded) {
          for (const track of stream.getTracks()) {
            entry.pc.addTrack(track, stream);
          }
          entry.tracksAdded = true;
        }
      });
    } catch (err) {
      alert("Cannot access camera/microphone. Please allow permissions.");
    }
  }, [micOn, videoOn]);

  useEffect(() => {
    const onRoomJoin = (data) => {
      setRoomId(data.room);
      setConnected(true);
      handleGetMedia();
    };
    socket.on("room:join", onRoomJoin);
    return () => socket.off("room:join", onRoomJoin);
  }, [socket, handleGetMedia]);

  // -------------------- Toggle Controls --------------------
  const toggleMic = () => {
    if (myStream) {
      myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
      setMicOn((prev) => !prev);
    }
  };

  const toggleVideo = async () => {
    if (!myStream) {
      await handleGetMedia();
      return;
    }
    myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    setVideoOn((prev) => !prev);
  };

  // -------------------- Layout --------------------
  const peersCount = Object.keys(remoteStreams).length;
  const showOwnFull = peersCount === 0;

  // CSS variables for layout sizing
  const cssVars = {
    "--navbar-height": `${NAVBAR_HEIGHT}px`,
    "--callbar-height": `${CALLBAR_HEIGHT}px`,
  };

  return (
    <div className="room-root" style={cssVars}>
      {/* Main content area between navbar and call bar */}
      <div className="room-content">
        {/* Video Grid */}
        <div className={`video-grid ${showOwnFull ? "single" : ""}`}>
          {/* Remote Streams */}
          {Object.entries(remoteStreams).map(([id, stream]) => (
            <div key={id} className="video-box">
              <ReactPlayer
                playing
                url={stream}
                muted={false}
                width="100%"
                height="100%"
                className="video-player"
              />
            </div>
          ))}

          {/* My Stream */}
          {myStream && (
            <div className={`video-box my-video ${showOwnFull ? "full" : "small"}`}>
              {videoOn ? (
                <ReactPlayer
                  playing
                  muted
                  url={myStream}
                  width="100%"
                  height="100%"
                  className="video-player"
                />
              ) : (
                <div className="video-off-placeholder">
                  <img
                    src={video_off_img}
                    alt="Video Off"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Call Bar */}
      <div className="call-bar">
        <div className="call-bar-center">
          <button className={`call-btn mic-btn ${micOn ? "" : "off"}`} onClick={toggleMic}>
            {micOn ? "🎙️ Mute" : "🔇 Unmute"}
          </button>
          <button className={`call-btn video-btn ${videoOn ? "" : "off"}`} onClick={toggleVideo}>
            {videoOn ? "🎥 Video Off" : "📷 Video On"}
          </button>
          <button
            className="call-btn end-btn"
            onClick={() => {
              myStream?.getTracks().forEach((t) => t.stop());
              setMyStream(null);
              peersRef.current.forEach((entry) => entry.pc.close());
              peersRef.current.clear();
              setRemoteStreams({});
              setConnected(false);
            }}
          >
            ❌ End Call
          </button>
        </div>
        <div className="call-bar-right">
          <button className="call-btn people-btn">👥 People</button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
