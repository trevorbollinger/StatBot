import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { formatNumber } from "../utils";

const Table = ({ data, showUserStats, onRowClick }) => {
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'message_count',
    direction: 'desc'
  });

  const calculateTotals = (items) => {
    return items.reduce((acc, item) => ({
      message_count: acc.message_count + item.message_count,
      total_words: acc.total_words + item.total_words,
      total_characters: acc.total_characters + item.total_characters,
      attachments: acc.attachments + item.attachments,
      mentions: acc.mentions + item.mentions,
      emojis: acc.emojis + item.emojis,
    }), {
      message_count: 0,
      total_words: 0,
      total_characters: 0,
      attachments: 0,
      mentions: 0,
      emojis: 0,
    });
  };

  const sortBy = (key) => {
    let direction = 'desc'; // Default to descending
    if (sortConfig.key === key) {
      // If already sorting by this key, toggle direction
      direction = sortConfig.direction === 'desc' ? 'asc' : 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getSortedItems = (items) => {
    if (!sortConfig.key) return items;

    return [...items].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Special handling for the first column
      if (sortConfig.key === 'name') {
        aValue = showUserStats ? a.user_name : a.channel_name;
        bValue = showUserStats ? b.user_name : b.channel_name;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedItems = useMemo(() => {
    if (!data) return [];
    const items = showUserStats ? data.users || [] : data.channels || [];
    return getSortedItems(items);
  }, [data, showUserStats, sortConfig]);

  const totals = useMemo(() => {
    if (!data) return null;
    const items = showUserStats ? data.users || [] : data.channels || [];
    return calculateTotals(items);
  }, [data, showUserStats]);

  if (error) return <div className="error-message">{error}</div>;
  if (!data) return null;

  return (
    <div className="stats-table-container">
      <table className="stats-table">
        <thead>
          <tr>
            <th onClick={() => sortBy('name')} className="sortable">
              {showUserStats ? "User" : "Channel"} {getSortIcon('name')}
            </th>
            <th onClick={() => sortBy('message_count')} className="sortable">
              Messages {getSortIcon('message_count')}
            </th>
            <th onClick={() => sortBy('total_words')} className="sortable">
              Words {getSortIcon('total_words')}
            </th>
            <th onClick={() => sortBy('total_characters')} className="sortable">
              Characters {getSortIcon('total_characters')}
            </th>

            <th>Most Active {showUserStats ? "Channel" : "User"}</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item, index) => (
            <tr key={index} onClick={() => onRowClick(item)} className="clickable-row">
              <td>
                {showUserStats ? (
                  <>
                    {item.user_name}
                    {item.nickname && <span className="nickname">({item.nickname})</span>}
                    {item.is_bot && <span className="bot-tag">BOT</span>}
                  </>
                ) : (
                  item.channel_name
                )}
              </td>
              <td>
                {formatNumber(item.message_count)} 
                <span className="percentage">
                  ({((item.message_count / totals.message_count) * 100).toFixed(1)}%)
                </span>
              </td>
              <td>
                {formatNumber(item.total_words)}
                <span className="percentage">
                  ({((item.total_words / totals.total_words) * 100).toFixed(1)}%)
                </span>
              </td>
              <td>
                {formatNumber(item.total_characters)}
                <span className="percentage">
                  ({((item.total_characters / totals.total_characters) * 100).toFixed(1)}%)
                </span>
              </td>
              <td>
                {showUserStats ? item.most_active_channel : item.most_active_user}{" "}
                ({(showUserStats ? item.most_active_channel_percentage : item.most_active_user_percentage).toFixed(1)}%)
              </td>
            </tr>
          ))}
          <tr className="totals-row">
            <td><strong>Totals</strong></td>
            <td>{formatNumber(totals.message_count)}</td>
            <td>{formatNumber(totals.total_words)}</td>
            <td>{formatNumber(totals.total_characters)}</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Table;