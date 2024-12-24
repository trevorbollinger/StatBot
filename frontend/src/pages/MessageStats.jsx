import { useState, useEffect } from "react";
import { Bar } from 'react-chartjs-2';
import { useRefresh } from '../components/RefreshContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import api from "../api";
import { formatNumber, handleCopyWithToast } from "../utils";
import LoadingIndicator from "../components/LoadingIndicator";
import "../styles/MessageStats.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

function MessageStats() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { autoRefresh, refreshInterval } = useRefresh();
    const [toast, setToast] = useState(null);

    const handleStatClick = (value, raw = false) => {
        handleCopyWithToast(value, raw, setToast);
    };

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await api.get("/api/stats/message-stats");
                setStats(response.data);
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

    if (isLoading) return (
        <div className="stats-loading-container">
            <LoadingIndicator />
        </div>
    );
    if (error) return <div className="error">{error}</div>;
    if (!stats) return null;

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: 'Daily Message Count',
                color: '#fff',
                font: {
                    size: 16
                }
            },
            tooltip: {
                callbacks: {
                    title: (context) => {
                        const date = new Date(context[0].label);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                        return `${dayName}, ${date.toLocaleDateString()}`;
                    },
                    label: (context) => {
                        return `${context.parsed.y} messages`;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#fff',
                    callback: function (value) {
                        const date = new Date(this.getLabelForValue(value));
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        return `${dayName}\n${date.toLocaleDateString()}`;
                    },
                    maxRotation: 0,
                    minRotation: 0
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            y: {
                ticks: {
                    color: '#fff',
                    display: false
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                max: 2200
            }
        },
        maintainAspectRatio: false
    };

    const chartData = stats ? {
        labels: stats.daily_messages.map(day => day.date),
        datasets: [{
            data: stats.daily_messages.map(day => day.count),
            backgroundColor: '#60a5fa',
            borderRadius: 4
        }]
    } : null;

    return (
        <div className="message-stats-container fade-in">
            <div className="card-container">
                <div className="stat-card" onClick={() => handleStatClick(stats.total_messages)}>
                    <div className="stat-label">Total Messages</div>
                    <div className="stat-number">{formatNumber(stats.total_messages)}</div>
                </div>
                <div className="stat-card" onClick={() => handleStatClick(stats.total_words)}>
                    <div className="stat-label">Total Words</div>
                    <div className="stat-number">{formatNumber(stats.total_words)}</div>
                </div>
                <div className="stat-card" onClick={() => handleStatClick(stats.total_characters)}>
                    <div className="stat-label">Total Characters</div>
                    <div className="stat-number">{formatNumber(stats.total_characters)}</div>
                </div>
                <div className="stat-card" onClick={() => handleStatClick((stats.total_words / stats.total_messages), true)}>
                    <div className="stat-label">Average Words / Message</div>
                    <div className="stat-number">
                        {(stats.total_messages > 0 ? (stats.total_words / stats.total_messages).toFixed(1) : 0)}
                    </div>
                </div>
                <div className="stat-card" onClick={() => handleStatClick((stats.total_characters / stats.total_messages), true)}>
                    <div className="stat-label">Average Chars / Message</div>
                    <div className="stat-number">
                        {(stats.total_messages > 0 ? (stats.total_characters / stats.total_messages).toFixed(1) : 0)}
                    </div>
                </div>
                <div className="stat-card" onClick={() => handleStatClick(stats.most_active_day?.count)}>
                    <div className="stat-label">Most Active Day</div>
                    <div className="stat-number">
                        {stats.most_active_day ?
                            `${new Date(stats.most_active_day.date).toLocaleDateString()}: ${formatNumber(stats.most_active_day.count)}`
                            : 'N/A'}
                    </div>
                </div>
                <div className="stat-card" onClick={() => handleStatClick(stats.least_active_day?.count)}>
                    <div className="stat-label">Least Active Day</div>
                    <div className="stat-number">
                        {stats.least_active_day ?
                            `${new Date(stats.least_active_day.date).toLocaleDateString()}: ${formatNumber(stats.least_active_day.count)}`
                            : 'N/A'}
                    </div>
                </div>
                <div className="stat-card" onClick={() => handleStatClick(stats.average_messages_per_day)}>
                    <div className="stat-label">Average Per Day</div>
                    <div className="stat-number">{formatNumber(stats.average_messages_per_day)}</div>
                </div>
                <div className="stat-card" onClick={() => handleStatClick(stats.messages_last_24_hours)}>
                    <div className="stat-label">Messages Last 24h</div>
                    <div className="stat-number">{formatNumber(stats.messages_last_24_hours)}</div>
                </div>
            </div>

            <div className="chart-container">
                <div style={{ height: '400px' }}>
                    {chartData && <Bar options={chartOptions} data={chartData} />}
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

export default MessageStats;