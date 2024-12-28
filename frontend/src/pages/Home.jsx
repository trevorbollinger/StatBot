import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthContext";
import { useNavigate } from "react-router-dom";
import Graph from "../components/Graph";
import api from "../api";
import "../styles/Home.css";
import {
  calculateAvgCharsPerMessage,
  formatNumber,
  handleCopyWithToast,
} from "../utils.js";
import LoadingIndicator from "../components/LoadingIndicator";
import { useRefresh } from "../components/RefreshContext";
import { CONFIG } from "../config.js";

function Home() {
  const { isAuthorized, username } = useAuth();
  const navigate = useNavigate();
  const [recentMessages, setRecentMessages] = useState([]);
  const [error, setError] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [peakHour, setPeakHour] = useState(null);
  const [dailyMessages, setDailyMessages] = useState([]);
  const [avgMessagesPerDay, setAvgMessagesPerDay] = useState(0);
  const [messagesLast24Hours, setMessagesLast24Hours] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [totalCharacters, setTotalCharacters] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [peakInterval, setPeakInterval] = useState(null);
  const [messageStats, setMessageStats] = useState(null);
  const { autoRefresh, refreshInterval } = useRefresh();
  const [toast, setToast] = useState(null);

  const formatTimeRange = (timestamp) => {
    if (!timestamp) return "N/A";
    const start = new Date(timestamp);
    const end = new Date(start);
    end.setMinutes(start.getMinutes() + 30);

    const formatTime = (date) => {
      return date
        .toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .toLowerCase();
    };

    return `${formatTime(start)}-${formatTime(end)}`;
  };

  const handleMessageClick = (messageId) => {
    navigate(`/database/message/${messageId}`);
  };

  const handleStatClick = (value, raw = false) => {
    handleCopyWithToast(value, raw, setToast);
  };

  useEffect(() => {
    document.title = CONFIG.title;

    async function fetchData() {
      try {
        const [messageStats, graphTimeline, recentMessages] = await Promise.all(
          [
            api.get("/api/stats/message-stats"),
            api.get("/api/stats/message-timeline"),
            api.get("/api/stats/recent-messages"),
          ]
        );

        if (messageStats.data) {
          setMessageStats(messageStats.data);
          setDailyMessages(messageStats.data.daily_messages);
          setAvgMessagesPerDay(messageStats.data.average_messages_per_day);
          setMessagesLast24Hours(messageStats.data.messages_last_24_hours);
          setTotalMessages(messageStats.data.total_messages);
          setTotalWords(messageStats.data.total_words);
          setTotalCharacters(messageStats.data.total_characters);
        }

        if (graphTimeline.data) {
          setTimelineData(graphTimeline.data.intervals);
        }

        if (recentMessages.data) {
          setRecentMessages(recentMessages.data.messages);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    let intervalId;

    if (autoRefresh) {
      intervalId = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval]);

  if (isLoading)
    return (
      <div className="stats-loading-container">
        <LoadingIndicator />
      </div>
    );

  return (
    <div className="home-container fade-in">
      <p>welcome to {CONFIG.title}</p>
      <div className="card-container">
        <div
          className="stat-card"
          onClick={() => handleStatClick(totalMessages)}
        >
          <div className="stat-label">Total Messages</div>
          <div className="stat-number">{formatNumber(totalMessages)}</div>
        </div>
        <div className="stat-card" onClick={() => handleStatClick(totalWords)}>
          <div className="stat-label">Total Words</div>
          <div className="stat-number">{formatNumber(totalWords)}</div>
        </div>
        <div
          className="stat-card"
          onClick={() => handleStatClick(totalCharacters)}
        >
          <div className="stat-label">Total Characters</div>
          <div className="stat-number">{formatNumber(totalCharacters)}</div>
        </div>
        <div
          className="stat-card"
          onClick={() =>
            handleStatClick(
              totalMessages > 0 ? (totalWords / totalMessages).toFixed(1) : 0,
              true
            )
          }
        >
          <div className="stat-label">Average Words / Message</div>
          <div className="stat-number">
            {totalMessages > 0 ? (totalWords / totalMessages).toFixed(1) : 0}
          </div>
        </div>
        <div
          className="stat-card"
          onClick={() =>
            handleStatClick(
              calculateAvgCharsPerMessage(totalCharacters, totalMessages),
              true
            )
          }
        >
          <div className="stat-label">Average Chars / Message</div>
          <div className="stat-number">
            {calculateAvgCharsPerMessage(totalCharacters, totalMessages)}
          </div>
        </div>
        <div
          className="stat-card"
          onClick={() => handleStatClick(messageStats?.most_active_day?.count)}
        >
          <div className="stat-label">Most Active Day</div>
          <div className="stat-number">
            {messageStats?.most_active_day ? (
              <>
                {new Date(
                  messageStats.most_active_day.date
                ).toLocaleDateString()}
                :
                <span className="stat-number">
                  {" "}
                  {formatNumber(messageStats.most_active_day.count)}
                </span>
              </>
            ) : (
              "N/A"
            )}
          </div>
        </div>
        <div
          className="stat-card"
          onClick={() => handleStatClick(avgMessagesPerDay)}
        >
          <div className="stat-label">Average Messages / Day</div>
          <div className="stat-number">{formatNumber(avgMessagesPerDay)}</div>
        </div>
        <div
          className="stat-card"
          onClick={() => handleStatClick(messagesLast24Hours)}
        >
          <div className="stat-label">Messages Last 24 Hours</div>
          <div className="stat-number">{formatNumber(messagesLast24Hours)}</div>
        </div>
      </div>

      <Graph data={timelineData} onPeakIntervalChange={setPeakInterval} />

      <div className="recent-messages">
        <div className="messages-list">
          {recentMessages.slice(0, 50).map((msg, index) => (
            <div
              key={index}
              className="recent-message-card"
              onClick={() => handleMessageClick(msg.id)}
            >
              <img
                src={
                  msg.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"
                }
                alt=""
                className="message-avatar"
                onError={(e) => {
                  e.target.src =
                    "https://cdn.discordapp.com/embed/avatars/0.png";
                }}
              />
              <div className="message-content-wrapper">
                <div className="message-header">
                  <div className="message-meta">
                    <span className="message-author">{msg.user_name}</span>
                    <span className="message-channel">#{msg.channel_name}</span>
                    <span className="message-time">{msg.relative_time}</span>
                    <div className="message-stats">
                      <span>
                        {formatNumber(msg.word_count)} words •{" "}
                        {formatNumber(msg.char_count)} chars
                      </span>
                    </div>
                  </div>
                </div>
                <div className="message-content-home">
                  {msg.message_content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  );
}

export default Home;
