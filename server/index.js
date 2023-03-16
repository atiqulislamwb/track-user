const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const axios = require("axios");
const server = http.createServer(app);
const io = require("socket.io")(server);
io.sockets.setMaxListeners(1000);
const PORT = 5000;
const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");
const { MongoClient, ServerApiVersion } = require("mongodb");
app.use(cors());
app.use(express.json());
const visits = [];
const activeUsers = new Set();

function getVisitorDevice(visitor) {
  const ua = visitor; // Assuming you have the visitor's user agent in the visitor object

  const parser = new UAParser(ua);
  const parsedUA = parser.getResult();

  if (parsedUA.device && parsedUA.device.model) {
    return parsedUA.device.model;
  } else {
    return "Unknown";
  }
}

function getVisitorLocation(visitor) {
  const ip = visitor; // Assuming you have the visitor's IP address in the visitor object

  const location = geoip.lookup(ip);

  if (location) {
    const { city, region, country } = location;
    return `${city}, ${region}, ${country}`;
  } else {
    return "Unknown";
  }
}

const uri =
  "mongodb+srv://aptdeco:1234567890@cluster0.gdutw1d.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const _db = client.db("serviceBell");
const Visitors = _db.collection("visitors");
const connect = async () => {
  await client.connect();
};

let callerSocket = null;
let calleeSocket = null;

app.get("/", async (req, res) => {
  // Record the visitor's information

  const ip = req?.ip;

  // Get user's location based on IP address
  // const locationResponse = await axios.get(
  //   `https://geo.ipify.org/api/v2/country,city?apiKey=at_o6wJvZuxvDKTtBXgPugx5kZEhrbcN&ipAddress=${ip}`
  // );
  // const locationData = locationResponse?.data;
  // const { city, region, country } = locationData?.location;
  const locationResponse = await axios.get(`http://ip-api.com/json/${ip}`);
  const locationData = locationResponse?.data;
  const { city, region, country } = locationData;

  // Get user's browser and device information based on User-Agent header
  const parser = new UAParser();
  const userAgent = req?.headers["user-agent"];
  const result = parser?.setUA(userAgent).getResult();
  const browserName = result?.browser.name;
  const deviceName = result?.device?.vendor + " " + result?.device?.model;

  let visit = {
    timestamp: new Date(),
    ip,
    browser: browserName,
    device: deviceName,
    location: `${country}, ${city}, ${region}`,
  };

  visits.push(visit);

  // Emit a notification to the admin dashboard
  io.emit("newVisit", visit);
  io.on("connection", (socket) => {
    var visitorId = socket.id;
    var visitorIpAddress = socket.handshake.address;
    console.log(visitorId);

    socket.on("updateActivityStatus", (activityStatus) => {
      visit.active = activityStatus;

      // Update database record for visitor with visitorId to include activityStatus
    });

    socket.on("user-visit", (visitor) => {
      activeUsers.add(visitor.id);
      io.emit("active-users", Array.from(activeUsers));
    });

    socket.on("user-leave", (visitor) => {
      activeUsers.delete(visitor.id);
      io.emit("active-users", Array.from(activeUsers));
    });

    socket.on("call", ({ ip }) => {
      console.log(`Incoming call from ${ip}`);

      if (calleeSocket) {
        // Reject the call if there's already a callee connected
        socket.emit("rejected");
      } else {
        // Set the callee socket and emit a "ring" event to the callee
        calleeSocket = socket;
        calleeSocket.emit("ring");
      }
    });

    socket.on("accept", () => {
      console.log("Call accepted");

      if (callerSocket) {
        // Set up a peer connection between the caller and callee
        const pc1 = new RTCPeerConnection();
        const pc2 = new RTCPeerConnection();

        pc1.onicecandidate = (event) => {
          if (event.candidate) {
            pc2.addIceCandidate(event.candidate);
          }
        };

        pc2.onicecandidate = (event) => {
          if (event.candidate) {
            pc1.addIceCandidate(event.candidate);
          }
        };

        pc1.ontrack = (event) => {
          console.log("Remote stream received");
          calleeSocket.emit("stream", { stream: event.streams[0] });
        };

        pc2.ontrack = (event) => {
          console.log("Remote stream received");
          callerSocket.emit("stream", { stream: event.streams[0] });
        };

        pc1.addTransceiver("video", { direction: "sendrecv" });
        pc1.addTransceiver("audio", { direction: "sendrecv" });

        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            console.log("Local stream obtained");
            stream.getTracks().forEach((track) => pc1.addTrack(track, stream));
            callerSocket.emit("stream", { stream });
          });

        pc1.createOffer().then((offer) => {
          pc1.setLocalDescription(offer);
          pc2.setRemoteDescription(offer);

          pc2.createAnswer().then((answer) => {
            pc2.setLocalDescription(answer);
            pc1.setRemoteDescription(answer);
          });
        });
      }
    });

    socket.on("reject", () => {
      console.log("Call rejected");
      socket.emit("rejected");
      if (calleeSocket === socket) {
        calleeSocket = null;
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client ${socket.id} disconnected`);
      if (callerSocket === socket) {
        callerSocket = null;
      }
      if (calleeSocket === socket) {
        calleeSocket = null;
      }

      if (!callerSocket) {
        console.log("Waiting for call...");
        callerSocket = socket;
      }
    });

    let active = true;
    const inactivityThreshold = 30000; // 30 seconds
    let lastActivityTime = Date.now();

    function updateUserActivity() {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - lastActivityTime;

      if (timeSinceLastActivity > inactivityThreshold && active) {
        active = false;
        socket.emit("updateActivityStatus", false);
      } else if (timeSinceLastActivity <= inactivityThreshold && !active) {
        active = true;
        socket.emit("updateActivityStatus", true);
      }

      setTimeout(updateUserActivity, 1000);
    }

    updateUserActivity();

    // Listen for user activity events and update the lastActivityTime variable
    const userActivityEvents = ["mousemove", "keydown", "click"];

    function handleUserActivityEvent() {
      lastActivityTime = Date.now();
    }

    userActivityEvents.forEach((event) => {
      socket.on(event, handleUserActivityEvent);
    });
  });

  // Listen for user activity events and update the activity status accordingly

  res.send({ msg: "Users Information", user: visit });
});

server.listen(PORT, async () => {
  await connect();
  console.log(`Server listening on port ${PORT}`);
});
