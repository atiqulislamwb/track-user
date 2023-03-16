import React from "react";
import { Link } from "react-router-dom";
import { GoBell } from "react-icons/go";
import { BsFillPeopleFill } from "react-icons/bs";
const Sidebar = () => {
  return (
    <div>
      <div className="p-5 flex flex-col gap-8">
        <div className="bg-orange-100 text-4xl flex items-center justify-center rounded-full ">
          <Link to="/" className="text-orange-500">
            <GoBell size={50} />
          </Link>
        </div>
        <Link to="/visitors" className="text-orange-500 text-4xl ">
          <BsFillPeopleFill />
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
