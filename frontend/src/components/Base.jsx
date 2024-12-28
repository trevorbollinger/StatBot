import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { useRefresh } from "./RefreshContext";
import "../styles/common.css";
import "../styles/Base.css";
import { CONFIG } from "../config.js";

const Base = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthorized, username, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { id } = useParams(); // Extract username from URL params
  const isMessageDetail = location.pathname.includes("/database/message/");
  const isUserProfile = location.pathname.includes("/user/");
  const pathname = location.pathname;
  const userProfileMatch = pathname.match(/\/user\/(.+)/);
  const profileUsername = userProfileMatch ? userProfileMatch[1] : "";

  const { autoRefresh, setAutoRefresh, refreshInterval, setRefreshInterval } =
    useRefresh();

  const intervalOptions = [
    { label: "1s", value: 1000 },
    { label: "3s", value: 3000 },
    { label: "10s", value: 10000 },
    { label: "30s", value: 30000 },
    { label: "1m", value: 60000 },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleClickOutside = (event) => {
    if (
      isMobileMenuOpen &&
      !event.target.closest(".sidebar") &&
      !event.target.closest(".mobile-menu-btn")
    ) {
      setIsMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {isMobileMenuOpen && <div className="sidebar-backdrop" />}
      {isAuthorized && (
        <div className={`sidebar ${isMobileMenuOpen ? "open" : ""}`}>
          <Link
            to="/"
            className={location.pathname === "/" ? "active" : ""}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/stats"
            className={location.pathname === "/stats" ? "active" : ""}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Statistics
          </Link>
          <Link
            to="/messagestats"
            className={location.pathname === "/messagestats" ? "active" : ""}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Message Statistics
          </Link>
          <Link
            to="/database"
            className={location.pathname === "/database" ? "active" : ""}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Database
          </Link>
          {/* <Link to="/random" className={location.pathname === '/random' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
            Random
          </Link> */}
          <div className="sidebar-toggle-container">
            <label className="toggle">
              Live Update
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span className="custom-checkbox"></span>
            </label>
          </div>
          {isMessageDetail && (
            <Link
              to={`/database/message/${id}`}
              className="nested-link active"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {" "}
              Message
            </Link>
          )}
          {isUserProfile && (
            <Link
              to={`/user/${profileUsername}`}
              className="nested-link active"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {" "}
              {profileUsername}
            </Link>
          )}
        </div>
      )}
      <nav className="navbar">
        <div className="navbar-left">
          <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
            ☰
          </button>
          <h1 className="navbar-logo">{CONFIG.title}</h1>
        </div>
        {isAuthorized ? (
          <div className="navbar-right">
            

            <div className="toggle-container desktop-only">
              <label className="toggle">
                Live Update
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span className="custom-checkbox"></span>
              </label>
            </div>
            <button onClick={handleLogout} className="button blue-button">
              Logout
            </button>
          </div>
        ) : (
          <></>
        )}
      </nav>
      <div className="body-content">{children}</div>
    </>
  );
};

export default Base;



