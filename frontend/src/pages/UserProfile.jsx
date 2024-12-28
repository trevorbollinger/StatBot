import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import LoadingIndicator from "../components/LoadingIndicator";
import { formatNumber } from "../utils";
import "../styles/UserProfile.css";

function UserProfile() {
  const { username } = useParams();
  const [user, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get(`/api/discorduser/${username}/`);
        setUserData(response.data);
      } catch (err) {
        setError("User not found");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username]);

  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!user) {
    return <div className="error-message">No user data found</div>;
  }

  return (
    <div className="user-profile-container fade-in">
      <div className="user-profile-header">
        {user.avatar_url && (
          <img
            src={user.avatar_url}
            alt="User avatar"
            className="user-avatar"
          />
        )}
        <div className="user-info">
          <h1>{user.name}</h1>
          {user.discriminator !== "0000" && (
            <div className="discriminator">#{user.discriminator}</div>
          )}
          {user.nickname && <div className="nickname">aka {user.nickname}</div>}
          <div className="user-id">ID: {user.id}</div>
          {user.color && (
            <div>
              <span
                className="color-display"
                style={{ backgroundColor: user.color }}
              />
              {user.color}
            </div>
          )}
          {user.is_bot && <span className="user-tag bot-tag">BOT</span>}
        </div>
      </div>

      <div className="user-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Messages</div>
          <div className="stat-value">{formatNumber(user.total_messages)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Words</div>
          <div className="stat-value">{formatNumber(user.total_words)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Characters</div>
          <div className="stat-value">
            {formatNumber(user.total_characters)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. Words per Message</div>
          <div className="stat-value">
            {formatNumber(user.total_words / user.total_messages)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
