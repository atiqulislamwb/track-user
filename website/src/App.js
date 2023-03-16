import logo from "./logo.svg";
import "./App.css";
import { useEffect, useState } from "react";
import io from "socket.io-client";
import { useRef } from "react";

const socket = io("http://localhost:5000/", {
  transports: ["websocket", "polling"],
});
function App() {
  const [user, setUser] = useState({});
  const [active, setActive] = useState(true);
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
    fetch("http://localhost:5000/")
      .then((response) => response.json())
      .then((data) => setUser(data?.user))
      .catch((err) => console.log(err));
  }, []);

  // useEffect(() => {
  //   // When the component mounts, emit an updateActivityStatus event with an initial value of true
  //   socket.emit("updateActivityStatus", true);

  //   // Listen for activityStatusUpdate events from the server and update the active state accordingly
  //   socket.on("activityStatusUpdate", (data) => {
  //     if (data.visitorId === socket.id) {
  //       setActive(data.activityStatus);
  //     }
  //   });
  // }, []);

  useEffect(() => {
    // Listen for user activity events and emit an updateActivityStatus event when the user becomes inactive
    let timer;

    function handleUserActivityEvent() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        socket.emit("updateActivityStatus", false);
      }, 30000);
    }

    window.addEventListener("mousemove", handleUserActivityEvent);
    window.addEventListener("keydown", handleUserActivityEvent);
    window.addEventListener("click", handleUserActivityEvent);

    return () => {
      // Clean up event listeners when the component unmounts
      window.removeEventListener("mousemove", handleUserActivityEvent);
      window.removeEventListener("keydown", handleUserActivityEvent);
      window.removeEventListener("click", handleUserActivityEvent);
      clearTimeout(timer);
    };
  }, []);

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
    <div className="App">
      <p>website</p>
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
}

export default App;
