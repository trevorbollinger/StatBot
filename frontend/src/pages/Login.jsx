import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext"; // Import the useAuth hook
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import LoadingIndicator from "../components/LoadingIndicator";
import "../styles/Login.css?v=1.0";
import { CONFIG } from "../config.js";

function Login() {
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fadeOut, setFadeOut] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    setFadeOut(false);
    setLoading(true);
    setError(null);
    e.preventDefault();

    try {
      // First, get the tokens
      const tokenRes = await api.post("/api/token/", { username, password });
      if (!tokenRes.data.access || !tokenRes.data.refresh) {
        throw new Error("Invalid token response");
      }

      // Store the tokens
      localStorage.setItem(ACCESS_TOKEN, tokenRes.data.access);
      localStorage.setItem(REFRESH_TOKEN, tokenRes.data.refresh);

      // Get user details with the new token
      try {
        const userRes = await api.get("/api/user/me/");
        const { first_name, last_name } = userRes.data;

        auth.login(username, first_name, last_name);
        navigate("/");
      } catch (userError) {
        console.error("Error fetching user details:", userError);
        throw new Error("Failed to fetch user details");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error.response?.data?.detail ||
          error.message ||
          "Invalid username or password"
      );
    } finally {
      setFadeOut(true);
      setTimeout(() => setLoading(false), 300); // Match animation duration
    }
  };

  return (
    <>
      {loading && (
        <div className={`loading-overlay ${fadeOut ? "fade-out" : ""}`}>
          <LoadingIndicator />
        </div>
      )}
      <div className="login-content">
        <form onSubmit={handleSubmit} className="login-form">
          <h1 className="login-title">Sign in to access {CONFIG.title}</h1>
          {error && <div className="error">{error}</div>}
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              autoComplete="username"
              className="login-input"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="login-input"
            />
          </div>
          <button type="submit" className="login-button">
            Sign In
          </button>
        </form>
      </div>
    </>
  );
}

export default Login;
