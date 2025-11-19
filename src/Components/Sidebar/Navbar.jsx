import React, { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";

// Icon imports
import { BiLogOut, BiLayout, BiLogIn } from "react-icons/bi";
import { TbLayoutGridAdd, TbMessages, TbUsers } from "react-icons/tb";
import { LuCircleDot, LuFile, LuUserCog, LuBarChart3 } from "react-icons/lu";
import { PiBasket, PiLightbulbThin } from "react-icons/pi";
import { CiShoppingBasket } from "react-icons/ci";
import { HiOutlineHome } from "react-icons/hi";
import { BsBell, BsGear } from "react-icons/bs";
import { GiHamburgerMenu } from "react-icons/gi";
import { RxCross1 } from "react-icons/rx";
import { FiUser } from "react-icons/fi";

// CSS
import "./Navbar.css";
import navlogo from "../../Assets/logo/nav-logo.png";

const Navbar = ({ children }) => {
  const [toggle, setToggle] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    setIsLoggedIn(!!token);
    setUserPermissions(user.permissions || []);
    setUserRole(user.role || "");
    setUserName(user.name || "");
  }, []);

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserPermissions([]);
    setUserRole("");
    setUserName("");
    navigate("/login");
  };

  const menuData = [
    { icon: <HiOutlineHome />, title: "Dashboard", path: "/", permission: "dashboard" },
    { icon: <LuUserCog />, title: "Admin", path: "/admin", permission: "admin" },
    { icon: <TbUsers />, title: "Customer", path: "/customer", permission: "customer" },
    { icon: <CiShoppingBasket />, title: "Vendor", path: "/vendor", permission: "vendor" },
    { icon: <LuFile />, title: "Items", path: "/items", permission: "items" },
    { icon: <TbLayoutGridAdd />, title: "Purchase Order", path: "/purchase-order", permission: "purchase-order" },
    { icon: <BsBell />, title: "GRN", path: "/grn", permission: "grn" },
    { icon: <PiLightbulbThin />, title: "Products", path: "/bom", permission: "bom" },
    { icon: <LuCircleDot />, title: "Work Order", path: "/work-order", permission: "work-order" },
    { icon: <PiBasket />, title: "Sales", path: "/sales", permission: "sales" },
    { icon: <BiLayout />, title: "Inventory", path: "/inventory", permission: "inventory" },
    { icon: <BsGear />, title: "Defective", path: "/defective", permission: "defective" },
    { icon: <LuBarChart3 />, title: "Reports", path: "/report", permission: "report" },
  ];

  // ✅ FIXED: Check both role AND admin permission
  const filteredMenu = (userRole === 'admin' || userPermissions.includes('admin'))
    ? menuData
    : menuData.filter(item => userPermissions.includes(item.permission));

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
                <img src={navlogo} alt="Techorses Logo" className="logoImage" />
                <RxCross1
                  className="menuIconHidden"
                  onClick={() => setToggle(true)}
                />
              </>
            )}
          </div>
        </div>

        {/* User Info Section */}
        {/* {isLoggedIn && userName && (
          <div className="user-info-section">
            <div className="user-avatar">
              <FiUser />
            </div>
            <div className="user-details">
              <div className="user-name">{userName}</div>
              <div className="user-role">
                {userRole === 'admin' || userPermissions.includes('admin') ? 'Administrator' : 'User'}
                {!(userRole === 'admin' || userPermissions.includes('admin')) && (
                  <span className="permissions-count">
                    ({userPermissions.length} permissions)
                  </span>
                )}
              </div>
            </div>
          </div>
        )} */}

        <ul className="side-menu top">
          {filteredMenu.map(({ icon, title, path }, i) => (
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

        {/* No Permissions Message */}
        {isLoggedIn && filteredMenu.length === 0 && (
          <div className="no-permissions-message">
            <div className="no-permissions-icon">⚠️</div>
            <p>No permissions assigned</p>
            <small>Contact administrator for access</small>
          </div>
        )}
      </div>

      <div id="content">
        <nav>
          <div className="nav-left">
            <GiHamburgerMenu
              className="menuIcon"
              onClick={() => setToggle(!toggle)}
            />
            {isLoggedIn && (
              <div className="mobile-user-info">
                <span>Welcome, {userName}</span>
                {(userRole === 'admin' || userPermissions.includes('admin')) && (
                  <span className="admin-badge">Admin</span>
                )}
              </div>
            )}
          </div>
          <div className="nav-right">
            {!isLoggedIn ? (
              <button className="icon-button" onClick={handleLogin} title="Login">
                <BiLogIn />
              </button>
            ) : (
              <div className="profile">
                <div className="profile-info">
                  <div className="profile-name">{userName}</div>
                  <div className="profile-role">
                    {userRole === 'admin' || userPermissions.includes('admin') ? 'Administrator' : 'User'}
                  </div>
                </div>
                {/* <div className="profile-icon" title={`${userName} (${userRole})`}>
                  <FiUser />
                </div> */}
                <button className="icon-button logout-icon-only" onClick={handleLogout} title="Logout">
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