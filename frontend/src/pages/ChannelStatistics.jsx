import { useState, useEffect } from "react";
import { useRefresh } from '../components/RefreshContext';
import api from "../api";
import "../styles/Statistics.css";
import LoadingIndicator from "../components/LoadingIndicator";
import { calculatePercentage, calculateAvgCharsPerMessage, formatNumber, sortItems } from "../utils";

function ChannelStatistics() {
    const [channelStats, setChannelStats] = useState(null);
    const [messageStats, setMessageStats] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'message_count', direction: 'descending' });
    const { autoRefresh, refreshInterval } = useRefresh();

    useEffect(() => {
        async function fetchStats() {
            try {
                const [channelsResponse, messageStatsResponse] = await Promise.all([
                    api.get("/api/stats/channels"),
                    api.get("/api/stats/message-stats"),
                ]);
                console.log("Raw response:", channelsResponse, messageStatsResponse); // Debug log
                if (channelsResponse.data && messageStatsResponse.data) {
                    setChannelStats(channelsResponse.data);
                    setMessageStats(messageStatsResponse.data);
                } else {
                    setError("No data received from API");
                }
            } catch (error) {
                console.error("Full error:", error); // Enhanced error logging
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchStats();
        let intervalId;
        
        if (autoRefresh) {
            intervalId = setInterval(fetchStats, refreshInterval);
        }
        
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [autoRefresh, refreshInterval]);

    const sortedChannels = () => {
        return sortItems(channelStats?.channels, sortConfig, messageStats);
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    if (error) return <div>Error: {error}</div>;
    if (!channelStats || !messageStats) return (
        <div className="stats-loading-container">
            <LoadingIndicator />
        </div>
    );

    return (
        <div className="stats-container fade-in">
            <div className="stats-sections-wrapper">
                <div className="stats-section">
                    <h2>Per-Channel Statistics</h2>
                    <div className="table-container">
                        <table className="sortable-table">
                            <thead>
                                <tr>
                                    {[
                                        { label: "Name", key: "channel_name" },
                                        { label: "Messages", key: "message_count" },
                                        { label: "Words", key: "total_words" },
                                        { label: "Characters", key: "total_characters" },
                                        { label: "CPM", key: "characters_per_message", style: { width: '70px' } },
                                        { label: "WPM", key: "words_per_message", style: { width: '70px' } },
                                        { label: "Most Active User", key: "most_active_user" }
                                    ].map(({ label, key, style }) => (
                                        <th key={key} onClick={() => requestSort(key)} style={style}>
                                            {label}
                                            {sortConfig.key === key ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : null}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedChannels().map((channel) => (
                                    <tr key={channel.channel_name}>
                                        <td>{channel.channel_name}</td>
                                        <td>{`${formatNumber(channel.message_count)} (${calculatePercentage(channel.message_count, messageStats.total_messages).toFixed(1)}%)`}</td>
                                        <td>{`${formatNumber(channel.total_words)} (${calculatePercentage(channel.total_words, messageStats.total_words).toFixed(1)}%)`}</td>
                                        <td>{`${formatNumber(channel.total_characters)} (${calculatePercentage(channel.total_characters, messageStats.total_characters).toFixed(1)}%)`}</td>
                                        <td>{calculateAvgCharsPerMessage(channel.total_characters, channel.message_count)}</td>
                                        <td>{(channel.total_words / (channel.message_count || 1)).toFixed(2)}</td>
                                        <td>{channel.most_active_user ? `${channel.most_active_user} (${channel.most_active_user_percentage}%)` : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChannelStatistics;
