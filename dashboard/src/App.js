import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import io from "socket.io-client";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import UserDetails from "./pages/UserDetails";
import Visits from "./pages/Visits";

const socket = io("http://localhost:5000/", {
  transports: ["websocket", "polling"],
});

const App = () => {
  const [visits, setVisits] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    // Listen for notifications from the API endpoint
    socket.on("newVisit", (visit) => {
      setVisits((prevVisits) => [...prevVisits, visit]);
    });
  }, []);

  useEffect(() => {
    socket.on("active-users", (activeUsers) => {
      setActiveUsers(activeUsers);
    });

    return () => {
      socket.off("active-users");
    };
  }, []);

  return (
    <div className=" flex flex-row  bg-gray-100 w-full h-screen">
      <div className="overflow-y-auto w-[120px] p-6">
        <Sidebar />
      </div>
      <div className="w-full overflow-y-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/visitors"
            element={<Visits visits={visits} activeUsers={activeUsers} />}
          />
          <Route path="/visitors/:id" element={<UserDetails />} />
        </Routes>
      </div>
    </div>
  );
};
export default App;
