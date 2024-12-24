import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useRefresh } from '../components/RefreshContext';
import api from "../api";
import "../styles/Statistics.css";
import LoadingIndicator from "../components/LoadingIndicator";
import { calculatePercentage, calculateAvgCharsPerMessage, formatNumber, sortItems } from "../utils";

function UserStatistics() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [messageStats, setMessageStats] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'message_count', direction: 'descending' });
    const { autoRefresh, refreshInterval } = useRefresh();

    useEffect(() => {
        async function fetchStats() {
            try {
                const [usersResponse, messageStatsResponse] = await Promise.all([
                    api.get("/api/stats/users"),
                    api.get("/api/stats/message-stats"),
                ]);
                console.log("Raw response:", usersResponse, messageStatsResponse); // Debug log
                if (usersResponse.data && messageStatsResponse.data) {
                    setStats(usersResponse.data);
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

    const sortedUsers = () => {
        return sortItems(stats?.users, sortConfig, messageStats);
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleRowClick = (username) => {
        navigate(`/user/${username}`);
    };

    const calculateTotals = (users) => {
        const totals = users?.reduce((acc, user) => ({
            messages: acc.messages + user.message_count,
            words: acc.words + user.total_words,
            characters: acc.characters + user.total_characters,
            messagePercentages: acc.messagePercentages + parseFloat(calculatePercentage(user.message_count, messageStats.total_messages)),
            wordPercentages: acc.wordPercentages + parseFloat(calculatePercentage(user.total_words, messageStats.total_words)),
            characterPercentages: acc.characterPercentages + parseFloat(calculatePercentage(user.total_characters, messageStats.total_characters))
        }), {
            messages: 0,
            words: 0,
            characters: 0,
            messagePercentages: 0,
            wordPercentages: 0,
            characterPercentages: 0
        });
        return totals;
    };

    if (error) return <div>Error: {error}</div>;
    if (!stats || !messageStats) return (
        <div className="stats-loading-container">
            <LoadingIndicator />
        </div>
    );

    return (
        <div className="stats-container fade-in">
            <div className="stats-sections-wrapper">
                <div className="stats-section">
                    <h2>Per-User Statistics</h2>
                    <div className="table-container">
                        <table className="sortable-table">
                            <thead>
                                <tr>
                                    {[
                                        { label: "Name", key: "user_name" },
                                        { label: "Messages", key: "message_count" },
                                        { label: "Words", key: "total_words" },
                                        { label: "Characters", key: "total_characters" },
                                        { label: "CPM", key: "characters_per_message", style: { width: '70px' } },
                                        { label: "WPM", key: "words_per_message", style: { width: '70px' } },
                                        { label: "Most Active Channel", key: "most_active_channel" }
                                    ].map(({ label, key, style }) => (
                                        <th key={key} onClick={() => requestSort(key)} style={style}>
                                            {label}
                                            {sortConfig.key === key ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : null}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedUsers().map((user) => (
                                    <tr 
                                        key={user.user_name} 
                                        onClick={() => handleRowClick(user.user_name)}
                                        className="clickable-row"
                                    >
                                        <td>{user.user_name}</td>
                                        <td>{`${formatNumber(user.message_count)} (${calculatePercentage(user.message_count, messageStats.total_messages).toFixed(1)}%)`}</td>
                                        <td>{`${formatNumber(user.total_words)} (${calculatePercentage(user.total_words, messageStats.total_words).toFixed(1)}%)`}</td>
                                        <td>{`${formatNumber(user.total_characters)} (${calculatePercentage(user.total_characters, messageStats.total_characters).toFixed(1)}%)`}</td>
                                        <td>{calculateAvgCharsPerMessage(user.total_characters, user.message_count)}</td>
                                        <td>{(user.total_words / (user.message_count || 1)).toFixed(2)}</td>
                                        <td>{user.most_active_channel ? `${user.most_active_channel} (${user.most_active_channel_percentage}%)` : 'N/A'}</td>
                                    </tr>
                                ))}
                                {stats?.users && (
                                    <tr className="totals-row">
                                        <td><strong>Totals</strong></td>
                                        {(() => {
                                            const totals = calculateTotals(stats.users);
                                            return (
                                                <>
                                                    <td>{`${formatNumber(totals.messages)} (${totals.messagePercentages.toFixed(1)}%)`}</td>
                                                    <td>{`${formatNumber(totals.words)} (${totals.wordPercentages.toFixed(1)}%)`}</td>
                                                    <td>{`${formatNumber(totals.characters)} (${totals.characterPercentages.toFixed(1)}%)`}</td>
                                                    <td>{calculateAvgCharsPerMessage(totals.characters, totals.messages)}</td>
                                                    <td>{(totals.words / totals.messages).toFixed(2)}</td>
                                                    <td>-</td>
                                                </>
                                            );
                                        })()}
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserStatistics;
