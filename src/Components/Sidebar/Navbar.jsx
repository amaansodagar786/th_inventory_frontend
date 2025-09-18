import React, { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";

// Icon imports
import { BiLogOut, BiLayout, BiLogIn } from "react-icons/bi";
import { TbLayoutGridAdd, TbMessages, TbUsers } from "react-icons/tb";
import { LuCircleDot, LuFile } from "react-icons/lu";
import { PiBasket, PiLightbulbThin } from "react-icons/pi";
import { CiShoppingBasket } from "react-icons/ci";
import { HiOutlineHome } from "react-icons/hi";
import { BsBell } from "react-icons/bs";
import { GiHamburgerMenu } from "react-icons/gi";
import { RxCross1 } from "react-icons/rx";
import { FiUser } from "react-icons/fi"; // profile icon

// CSS
import "./Navbar.css";

const Navbar = ({ children }) => {
  const [toggle, setToggle] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/login");
  };

  const menuData = [
    { icon: <HiOutlineHome />, title: "Dashboard", path: "/" },
    { icon: <TbUsers />, title: "Customer", path: "/customer" },
    { icon: <CiShoppingBasket />, title: "Vendor", path: "/vendor" },
    { icon: <LuFile />, title: "Items", path: "/items" },
    { icon: <TbLayoutGridAdd />, title: "Purchase Order", path: "/purchase-order" },
    { icon: <BsBell />, title: "GRN", path: "/grn" },
    { icon: <PiLightbulbThin />, title: "BOM", path: "/bom" },
    { icon: <LuCircleDot />, title: "Work Order", path: "/work-order" },
    { icon: <PiBasket />, title: "Sales", path: "/sales" },
    { icon: <BiLayout />, title: "Inventory", path: "/inventory" },
    { icon: <TbMessages />, title: "Defective", path: "/defective" },
    { icon: <TbMessages />, title: "Report", path: "/report" },
  ];

  return (
    <>
      <div id="sidebar" className={toggle ? "hide" : ""}>
        <div className="logo">
          <div className="logoBox">
            {toggle ? (
              <GiHamburgerMenu
                className="menuIconHidden"
                onClick={() => setToggle(false)}
              />
            ) : (
              <>
                <h2 className="logoText">Techorses</h2>
                <RxCross1
                  className="menuIconHidden"
                  onClick={() => setToggle(true)}
                />
              </>
            )}
          </div>
        </div>

        <ul className="side-menu top">
          {menuData.map(({ icon, title, path }, i) => (
            <li key={i}>
              <NavLink
                to={path}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <span className="menu-icon">{icon}</span>
                <span className="menu-title">{title}</span>
              </NavLink>
            </li>
          ))}

          {isLoggedIn && (
            <li className="logout-menu-item">
              <button className="sidebar-logout-btn" onClick={handleLogout}>
                <BiLogOut />
                <span>Logout</span>
              </button>
            </li>
          )}
        </ul>
      </div>

      <div id="content">
        <nav>
          <div>
            <GiHamburgerMenu
              className="menuIcon"
              onClick={() => setToggle(!toggle)}
            />
          </div>
          <div>
            {!isLoggedIn ? (
              <button className="icon-button" onClick={handleLogin} title="Login">
                <BiLogIn />
              </button>
            ) : (
              <div className="profile">
                {/* profile icon instead of image */}
                <div className="profile-icon" title="Account">
                  <FiUser />
                </div>
                <button className="icon-button" onClick={handleLogout} title="Logout">
                  <BiLogOut />
                </button>
              </div>
            )}
          </div>
        </nav>
        {children}
      </div>
    </>
  );
};

export default Navbar;
