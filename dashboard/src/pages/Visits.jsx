import React, { useEffect, useRef, useState } from "react";
import { useContext } from "react";
import { SocketContext } from "../context/context";
import useAdmin from "../hooks/useAdmin";
import io from "socket.io-client";
const Visits = ({ visits, activeUsers }) => {
  const [socket, setSocket] = useState(null);
  const [callStatus, setCallStatus] = useState("idle");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const newSocket = io("http://localhost:5000/", {
      transports: ["websocket", "polling"],
    });
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleCall = async (ip) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);

    socket.emit("call", { ip });
    setCallStatus("ringing");
  };

  const handleAccept = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);

    socket.emit("accept");
    setCallStatus("connected");
  };

  const handleReject = () => {
    socket.emit("reject");
    setCallStatus("rejected");
  };

  return (
    <div className="">
      <p className="m-10 text-3xl font-bold text-orange-500">Visitors</p>
      <div className="flex flex-row gap-10">
        <div className="flex flex-col gap-3">
          {visits?.map((visitor, i) => (
            <div key={i} className="w-[300px] text-sm bg-gray-200">
              <p>{visitor?.name || "Anonymous"}</p>
              <p>{visitor?.location}</p>
              <p>{visitor?.device}</p>

              <p>ip: {visitor.ip}</p>
              <button onClick={() => handleCall(visitor?.ip)}>Call User</button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex ">
        {callStatus === "ringing" && (
          <>
            <p>Incoming call...</p>
            <button onClick={handleAccept}>Accept</button>
            <button onClick={handleReject}>Reject</button>
          </>
        )}
        {callStatus === "connected" && (
          <>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              width="320"
              height="240"
            />
            <video ref={remoteVideoRef} autoPlay width="320" height="240" />
          </>
        )}
        {callStatus === "rejected" && <p>Call rejected</p>}
      </div>
    </div>
  );
};

export default Visits;
