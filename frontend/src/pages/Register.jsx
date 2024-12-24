import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext";
import LoadingIndicator from "../components/LoadingIndicator";
import "../styles/Register.css";

function Register() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [first_name, setFName] = useState("");
  const [last_name, setLName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Add this line
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    setLoading(true);
    setError(null); // Add this line
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      await api.post("/api/user/register/", { username, password, first_name, last_name });
      navigate("/login");
    } catch (error) {
      setError(error.response?.data?.detail || "An error occurred. (username already taken?)"); // Update this line
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} className="register-form">
        <h1 className="register-title">Create Account</h1>
        {error && <div className="error">{error}</div>}

          <input
            className="register-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            autoComplete="username"
          />

          <input
            className="register-input"
            type="text"
            value={first_name}
            onChange={(e) => setFName(e.target.value)}
            placeholder="First Name"
            required
          />
   
          <input
            className="register-input"
            type="text"
            value={last_name}
            onChange={(e) => setLName(e.target.value)}
            placeholder="Last Name"
            required
          />

          <input
            className="register-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="new-password"
          />


          <input
            className="register-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            required
            autoComplete="new-password"
          />


        {loading ? (
          <LoadingIndicator />
        ) : (
          <button type="submit" className="register-button">
            Create Account
          </button>
        )}
        <a href="/login" className="register-link">
          Already have an account? Sign in here
        </a>
      </form>
    </div>
  );
}

export default Register; // Ensure this line is present
