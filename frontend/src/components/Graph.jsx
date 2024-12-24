import { useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import '../styles/Graph.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const aggregate30MinIntervals = (intervals) => {
    const groupedData = {};
    
    intervals.forEach(interval => {
        const date = new Date(interval.timestamp); // Fixed typo here
        date.setMinutes(Math.floor(date.getMinutes() / 30) * 30);
        date.setSeconds(0);
        const key = date.toISOString();
        
        if (!groupedData[key]) {
            groupedData[key] = { timestamp: key, count: 0 };
        }
        groupedData[key].count += interval.count;
    });

    return Object.values(groupedData).sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );
};

const chartOptions = {
    responsive: true,
    plugins: {
        legend: {
            display: false
        },
        title: {
            display: false,
            text: 'Messages per 30 Minutes (Last 24 Hours)',
            color: '#fff'
        },
        tooltip: {
            callbacks: {
                title: (context) => {
                    const timestamp = context[0].label;
                    const start = new Date(timestamp);
                    const end = new Date(start);
                    end.setMinutes(start.getMinutes() + 30);
                    
                    const formatTime = (date) => {
                        return date.toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }).toLowerCase();
                    };

                    return `${formatTime(start)} to ${formatTime(end)}`;
                },
                label: (context) => {
                    return `${context.parsed.y} messages`;
                }
            }
        },
        datalabels: {
            display: false  // Explicitly disable data labels
        }
    },
    scales: {
        x: {
            ticks: {
                color: '#fff',
                maxTicksLimit: 12,
                callback: function(value, index) {
                    const date = new Date(this.getLabelForValue(value));
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            },
            grid: {
                color: 'rgba(255, 255, 255, 0.1)'
            }
        },
        y: {
            ticks: {
                color: '#fff',
                display: false  // Show Y-axis numbers, will be hidden by CSS on mobile
            },
            grid: {
                color: 'rgba(255, 255, 255, 0.1)'
            }        }
    },
    maintainAspectRatio: false,
    elements: {
        point: {
            radius: 0  // Hide points on the line
        },
        line: {
            borderWidth: 2
        }
    }
};

function Graph({ data, onPeakIntervalChange }) {
    const aggregatedIntervals = useMemo(() => 
        data && data.length ? aggregate30MinIntervals(data) : []
    , [data]);
    
    const processedData = useMemo(() => 
        aggregatedIntervals.length ? {
            labels: aggregatedIntervals.map(interval => interval.timestamp),
            datasets: [{
                label: 'Messages',
                data: aggregatedIntervals.map(interval => interval.count),
                borderColor: 'hsl(210, 100%, 50%)',
                backgroundColor: 'rgba(0, 149, 255, 0.1)',
                tension: 0.38
            }]
        } : null
    , [aggregatedIntervals]);

    useEffect(() => {
        if (aggregatedIntervals.length > 0) {
            const peakInterval = aggregatedIntervals.reduce((max, current) => 
                current.count > max.count ? current : max
            , aggregatedIntervals[0]);
            
            onPeakIntervalChange?.(peakInterval);
        }
    }, [aggregatedIntervals, onPeakIntervalChange]);

    return (
        <div className="timeline-graph">
            {processedData && Object.keys(processedData).length > 0 && (
                <Line data={processedData} options={chartOptions} />
            )}
        </div>
    );
}

export default Graph;
