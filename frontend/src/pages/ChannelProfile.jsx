import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import LoadingIndicator from "../components/LoadingIndicator";
import { formatNumber } from "../utils";
import "../styles/ChannelProfile.css";

function ChannelProfile() {
  const { channel_name } = useParams(); 
  const [channel, setChannelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChannelData = async () => {
      if (!channel_name) {
        setError("No channel specified");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/api/channel/${channel_name}/`);
        setChannelData(response.data);
      } catch (err) {
        setError(
          err.response?.status === 404
            ? "Channel not found"
            : "Error loading channel data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchChannelData();
  }, [channel_name]);

  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!channel) {
    return <div className="error-message">No channel data found</div>;
  }

  return (
    <div className="channel-profile-container fade-in">
      <div className="channel-profile-header">
        {channel.guild_icon_url && (
          <img
            src={channel.guild_icon_url}
            alt="Guild icon"
            className="guild-icon"
          />
        )}
        <div className="channel-info">
          <h1>#{channel.name}</h1>
          <div className="channel-id">ID: {channel.id}</div>
          <div className="channel-category">
            Category: {channel.category_name || "None"}
          </div>
          {channel.topic && (
            <div className="channel-topic">{channel.topic}</div>
          )}
          <div className="channel-type">
            Type: {channel.type.charAt(0).toUpperCase() + channel.type.slice(1)}
          </div>
        </div>
      </div>

      <div className="channel-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Messages</div>
          <div className="stat-value">
            {formatNumber(channel.total_messages)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Words</div>
          <div className="stat-value">{formatNumber(channel.total_words)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Characters</div>
          <div className="stat-value">
            {formatNumber(channel.total_characters)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. Words per Message</div>
          <div className="stat-value">
            {formatNumber(channel.total_words / channel.total_messages)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChannelProfile;
