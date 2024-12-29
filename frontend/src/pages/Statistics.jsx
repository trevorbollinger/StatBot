import { useState, useEffect, useCallback } from "react";
import { useRefresh } from "../components/RefreshContext";
import api from "../api";
import LoadingIndicator from "../components/LoadingIndicator";
import "../styles/Statistics.css";
import Table from "../components/Table";
import { useNavigate } from "react-router-dom";

const Statistics = () => {
  const [showUserStats, setShowUserStats] = useState(true);
  const [userData, setUserData] = useState(null);
  const [channelData, setChannelData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [includeBots, setIncludeBots] = useState(false);
  const navigate = useNavigate();
  const { refreshTrigger, autoRefresh } = useRefresh();

  const fetchData = useCallback(
    async (isUserData) => {
      try {
        const endpoint = isUserData
          ? "/api/stats/users/"
          : "/api/stats/channels/";
        const url = `${endpoint}${
          !includeBots
            ? "?exclude_bots=true&exclude_channel=bot-shit&exclude_user=Dank Memer"
            : ""
        }`;
        const response = await api.get(url);
        if (isUserData) {
          setUserData(response.data);
        } else {
          setChannelData(response.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    },
    [includeBots]
  );

  // Combined effect for both initial load and refresh
  useEffect(() => {
    const load = async () => {
      if (!userData && !channelData) {
        setInitialLoading(true);
        await fetchData(true);
        setInitialLoading(false);
      } else {
        await fetchData(showUserStats);
      }
    };

    load();

    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchData(showUserStats);
      }, 5000); // Changed from 100000 to 20000 (20 seconds)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshTrigger, autoRefresh, showUserStats, fetchData]);

  const handleRadioChange = (e) => {
    const isUserStats = e.target.id === "radio-1";
    setShowUserStats(isUserStats);

    // Always fetch new data when switching views
    fetchData(isUserStats);
  };

  const handleRowClick = (item) => {
    if (showUserStats) {
      navigate(`/user/${item.user_name}`);
    } else {
      navigate(`/channel/${item.channel_name}`);
    }
  };

  const currentData = showUserStats ? userData : channelData;

  return (
    <div
      className="statistics-container fade-in"
      data-active-index={showUserStats ? "0" : "1"}
    >
      <div className="stats-header">
        <div className="custom-tabs-container">
          <div className="custom-tabs">
            <input
              type="radio"
              id="radio-1"
              name="tabs"
              defaultChecked
              onChange={handleRadioChange}
            />
            <label className="custom-tab" htmlFor="radio-1">
              User
            </label>
            <input
              type="radio"
              id="radio-2"
              name="tabs"
              onChange={handleRadioChange}
            />
            <label className="custom-tab" htmlFor="radio-2">
              Channel
            </label>
            <span className="custom-glider"></span>
          </div>
        </div>

        <div className="toggle-container stats-toggle">
          <label className="toggle">
            Include Bots
            <input
              type="checkbox"
              checked={includeBots}
              onChange={(e) => {
                setIncludeBots(e.target.checked);
                fetchData(showUserStats);
              }}
            />
            <span className="custom-checkbox"></span>
          </label>
        </div>
      </div>
      <div className="stats-content">
        {initialLoading ? (
          <LoadingIndicator />
        ) : (
          currentData && (
            <Table
              data={currentData}
              showUserStats={showUserStats}
              onRowClick={handleRowClick}
            />
          )
        )}
      </div>
    </div>
  );
};

export default Statistics;
