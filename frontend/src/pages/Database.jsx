import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import LoadingIndicator from '../components/LoadingIndicator';
import '../styles/Database.css';
import '../styles/common.css';
import { CONFIG } from '../config.js';

const Database = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('adminPanelPageSize');
        return saved ? parseInt(saved) : 50;
    });
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem('adminPanelFilters');
        return saved ? JSON.parse(saved) : {
            server: '',
            channel: '',
            user: '',
            date: '',
            hasAttachment: false,
            hasMention: false,
            hasEmoji: false
        };
    });
    const [filterOptions, setFilterOptions] = useState({
        servers: [],
        channels: [],
        users: []
    });
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [timezone, setTimezone] = useState(() => {
        const saved = localStorage.getItem('adminPanelTimezone');
        return saved || 'US/Central';
    });
    const navigate = useNavigate();

    const pageSizeOptions = [50, 100, 200, 500, 1000];

    const timezones = ['UTC', 'US/Pacific', 'US/Mountain', 'US/Central', 'US/Eastern', 'Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', 'Africa/Asmara', 'Africa/Bamako', 'Africa/Bangui', 'Africa/Banjul', 'Africa/Bissau', 'Africa/Blantyre', 'Africa/Brazzaville', 'Africa/Bujumbura', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Ceuta', 'Africa/Conakry', 'Africa/Dakar', 'Africa/Dar_es_Salaam', 'Africa/Djibouti', 'Africa/Douala', 'Africa/El_Aaiun', 'Africa/Freetown', 'Africa/Gaborone', 'Africa/Harare', 'Africa/Johannesburg', 'Africa/Juba', 'Africa/Kampala', 'Africa/Khartoum', 'Africa/Kigali', 'Africa/Kinshasa', 'Africa/Lagos', 'Africa/Libreville', 'Africa/Lome', 'Africa/Luanda', 'Africa/Lubumbashi', 'Africa/Lusaka', 'Africa/Malabo', 'Africa/Maputo', 'Africa/Maseru', 'Africa/Mbabane', 'Africa/Mogadishu', 'Africa/Monrovia', 'Africa/Nairobi', 'Africa/Ndjamena', 'Africa/Niamey', 'Africa/Nouakchott', 'Africa/Ouagadougou', 'Africa/Porto-Novo', 'Africa/Sao_Tome', 'Africa/Tripoli', 'Africa/Tunis', 'Africa/Windhoek', 'America/Adak', 'America/Anchorage', 'America/Anguilla', 'America/Antigua', 'America/Araguaina', 'America/Argentina/Buenos_Aires', 'America/Argentina/Catamarca', 'America/Argentina/Cordoba', 'America/Argentina/Jujuy', 'America/Argentina/La_Rioja', 'America/Argentina/Mendoza', 'America/Argentina/Rio_Gallegos', 'America/Argentina/Salta', 'America/Argentina/San_Juan', 'America/Argentina/San_Luis', 'America/Argentina/Tucuman', 'America/Argentina/Ushuaia', 'America/Aruba', 'America/Asuncion', 'America/Atikokan', 'America/Bahia', 'America/Bahia_Banderas', 'America/Barbados', 'America/Belem', 'America/Belize', 'America/Blanc-Sablon', 'America/Boa_Vista', 'America/Bogota', 'America/Boise', 'America/Cambridge_Bay', 'America/Campo_Grande', 'America/Cancun', 'America/Caracas', 'America/Cayenne', 'America/Cayman', 'America/Chicago', 'America/Chihuahua', 'America/Costa_Rica', 'America/Creston', 'America/Cuiaba', 'America/Curacao', 'America/Danmarkshavn', 'America/Dawson', 'America/Dawson_Creek', 'America/Denver', 'America/Detroit', 'America/Dominica', 'America/Edmonton', 'America/Eirunepe', 'America/El_Salvador', 'America/Fort_Nelson', 'America/Fortaleza', 'America/Glace_Bay', 'America/Goose_Bay', 'America/Grand_Turk', 'America/Grenada', 'America/Guadeloupe', 'America/Guatemala', 'America/Guayaquil', 'America/Guyana', 'America/Halifax', 'America/Havana', 'America/Hermosillo', 'America/Indiana/Indianapolis', 'America/Indiana/Knox', 'America/Indiana/Marengo', 'America/Indiana/Petersburg', 'America/Indiana/Tell_City', 'America/Indiana/Vevay', 'America/Indiana/Vincennes', 'America/Indiana/Winamac', 'America/Inuvik', 'America/Iqaluit', 'America/Jamaica', 'America/Juneau', 'America/Kentucky/Louisville', 'America/Kentucky/Monticello', 'America/Kralendijk', 'America/La_Paz', 'America/Lima', 'America/Los_Angeles', 'America/Lower_Princes', 'America/Maceio', 'America/Managua', 'America/Manaus', 'America/Marigot', 'America/Martinique', 'America/Matamoros', 'America/Mazatlan', 'America/Menominee', 'America/Merida', 'America/Metlakatla', 'America/Mexico_City', 'America/Miquelon', 'America/Moncton', 'America/Monterrey', 'America/Montevideo', 'America/Montserrat', 'America/Nassau', 'America/New_York', 'America/Nipigon', 'America/Nome', 'America/Noronha', 'America/North_Dakota/Beulah', 'America/North_Dakota/Center', 'America/North_Dakota/New_Salem', 'America/Nuuk', 'America/Ojinaga', 'America/Panama', 'America/Pangnirtung', 'America/Paramaribo', 'America/Phoenix', 'America/Port-au-Prince', 'America/Port_of_Spain', 'America/Porto_Velho', 'America/Puerto_Rico', 'America/Punta_Arenas', 'America/Rainy_River', 'America/Rankin_Inlet', 'America/Recife', 'America/Regina', 'America/Resolute', 'America/Rio_Branco', 'America/Santarem', 'America/Santiago', 'America/Santo_Domingo', 'America/Sao_Paulo', 'America/Scoresbysund', 'America/Sitka', 'America/St_Barthelemy', 'America/St_Johns', 'America/St_Kitts', 'America/St_Lucia', 'America/St_Thomas', 'America/St_Vincent', 'America/Swift_Current', 'America/Tegucigalpa', 'America/Thule', 'America/Thunder_Bay', 'America/Tijuana', 'America/Toronto', 'America/Tortola', 'America/Vancouver', 'America/Whitehorse', 'America/Winnipeg', 'America/Yakutat', 'America/Yellowknife', 'Antarctica/Casey', 'Antarctica/Davis', 'Antarctica/DumontDUrville', 'Antarctica/Macquarie', 'Antarctica/Mawson', 'Antarctica/McMurdo', 'Antarctica/Palmer', 'Antarctica/Rothera', 'Antarctica/Syowa', 'Antarctica/Troll', 'Antarctica/Vostok', 'Arctic/Longyearbyen', 'Asia/Aden', 'Asia/Almaty', 'Asia/Amman', 'Asia/Anadyr', 'Asia/Aqtau', 'Asia/Aqtobe', 'Asia/Ashgabat', 'Asia/Atyrau', 'Asia/Baghdad', 'Asia/Bahrain', 'Asia/Baku', 'Asia/Bangkok', 'Asia/Barnaul', 'Asia/Beirut', 'Asia/Bishkek', 'Asia/Brunei', 'Asia/Chita', 'Asia/Choibalsan', 'Asia/Colombo', 'Asia/Damascus', 'Asia/Dhaka', 'Asia/Dili', 'Asia/Dubai', 'Asia/Dushanbe', 'Asia/Famagusta', 'Asia/Gaza', 'Asia/Hebron', 'Asia/Ho_Chi_Minh', 'Asia/Hong_Kong', 'Asia/Hovd', 'Asia/Irkutsk', 'Asia/Jakarta', 'Asia/Jayapura', 'Asia/Jerusalem', 'Asia/Kabul', 'Asia/Kamchatka', 'Asia/Karachi', 'Asia/Kathmandu', 'Asia/Khandyga', 'Asia/Kolkata', 'Asia/Krasnoyarsk', 'Asia/Kuala_Lumpur', 'Asia/Kuching', 'Asia/Kuwait', 'Asia/Macau', 'Asia/Magadan', 'Asia/Makassar', 'Asia/Manila', 'Asia/Muscat', 'Asia/Nicosia', 'Asia/Novokuznetsk', 'Asia/Novosibirsk', 'Asia/Omsk', 'Asia/Oral', 'Asia/Phnom_Penh', 'Asia/Pontianak', 'Asia/Pyongyang', 'Asia/Qatar', 'Asia/Qostanay', 'Asia/Qyzylorda', 'Asia/Riyadh', 'Asia/Sakhalin', 'Asia/Samarkand', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Srednekolymsk', 'Asia/Taipei', 'Asia/Tashkent', 'Asia/Tbilisi', 'Asia/Tehran', 'Asia/Thimphu', 'Asia/Tokyo', 'Asia/Tomsk', 'Asia/Ulaanbaatar', 'Asia/Urumqi', 'Asia/Ust-Nera', 'Asia/Vientiane', 'Asia/Vladivostok', 'Asia/Yakutsk', 'Asia/Yangon', 'Asia/Yekaterinburg', 'Asia/Yerevan', 'Atlantic/Azores', 'Atlantic/Bermuda', 'Atlantic/Canary', 'Atlantic/Cape_Verde', 'Atlantic/Faroe', 'Atlantic/Madeira', 'Atlantic/Reykjavik', 'Atlantic/South_Georgia', 'Atlantic/St_Helena', 'Atlantic/Stanley', 'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Broken_Hill', 'Australia/Currie', 'Australia/Darwin', 'Australia/Eucla', 'Australia/Hobart', 'Australia/Lindeman', 'Australia/Lord_Howe', 'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney', 'Canada/Atlantic', 'Canada/Central', 'Canada/Eastern', 'Canada/Mountain', 'Canada/Newfoundland', 'Canada/Pacific', 'Europe/Amsterdam', 'Europe/Andorra', 'Europe/Astrakhan', 'Europe/Athens', 'Europe/Belgrade', 'Europe/Berlin', 'Europe/Bratislava', 'Europe/Brussels', 'Europe/Bucharest', 'Europe/Budapest', 'Europe/Busingen', 'Europe/Chisinau', 'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Gibraltar', 'Europe/Guernsey', 'Europe/Helsinki', 'Europe/Isle_of_Man', 'Europe/Istanbul', 'Europe/Jersey', 'Europe/Kaliningrad', 'Europe/Kiev', 'Europe/Kirov', 'Europe/Lisbon', 'Europe/Ljubljana', 'Europe/London', 'Europe/Luxembourg', 'Europe/Madrid', 'Europe/Malta', 'Europe/Mariehamn', 'Europe/Minsk', 'Europe/Monaco', 'Europe/Moscow', 'Europe/Oslo', 'Europe/Paris', 'Europe/Podgorica', 'Europe/Prague', 'Europe/Riga', 'Europe/Rome', 'Europe/Samara', 'Europe/San_Marino', 'Europe/Sarajevo', 'Europe/Saratov', 'Europe/Simferopol', 'Europe/Skopje', 'Europe/Sofia', 'Europe/Stockholm', 'Europe/Tallinn', 'Europe/Tirane', 'Europe/Ulyanovsk', 'Europe/Uzhgorod', 'Europe/Vaduz', 'Europe/Vatican', 'Europe/Vienna', 'Europe/Vilnius', 'Europe/Volgograd', 'Europe/Warsaw', 'Europe/Zagreb', 'Europe/Zaporozhye', 'Europe/Zurich', 'GMT', 'Indian/Antananarivo', 'Indian/Chagos', 'Indian/Christmas', 'Indian/Cocos', 'Indian/Comoro', 'Indian/Kerguelen', 'Indian/Mahe', 'Indian/Maldives', 'Indian/Mauritius', 'Indian/Mayotte', 'Indian/Reunion', 'Pacific/Apia', 'Pacific/Auckland', 'Pacific/Bougainville', 'Pacific/Chatham', 'Pacific/Chuuk', 'Pacific/Easter', 'Pacific/Efate', 'Pacific/Enderbury', 'Pacific/Fakaofo', 'Pacific/Fiji', 'Pacific/Funafuti', 'Pacific/Galapagos', 'Pacific/Gambier', 'Pacific/Guadalcanal', 'Pacific/Guam', 'Pacific/Honolulu', 'Pacific/Kiritimati', 'Pacific/Kosrae', 'Pacific/Kwajalein', 'Pacific/Majuro', 'Pacific/Marquesas', 'Pacific/Midway', 'Pacific/Nauru', 'Pacific/Niue', 'Pacific/Norfolk', 'Pacific/Noumea', 'Pacific/Pago_Pago', 'Pacific/Palau', 'Pacific/Pitcairn', 'Pacific/Pohnpei', 'Pacific/Port_Moresby', 'Pacific/Rarotonga', 'Pacific/Saipan', 'Pacific/Tahiti', 'Pacific/Tarawa', 'Pacific/Tongatapu', 'Pacific/Wake', 'Pacific/Wallis', 'US/Alaska', 'US/Hawaii', 'US/Arizona'];

    const getChannelCategories = () => {
        return Object.entries(CONFIG)
            .filter(([key]) => key.startsWith('CHANNELS_'))
            .map(([key, value]) => ({
                name: key.replace('CHANNELS_', '').toLowerCase(),
                channels: value
            }));
    };

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        fetchMessages();
    }, [page, pageSize, filters, timezone]);

    // Update localStorage when filters change
    useEffect(() => {
        localStorage.setItem('adminPanelFilters', JSON.stringify(filters));
    }, [filters]);

    // Update localStorage when page size changes
    useEffect(() => {
        localStorage.setItem('adminPanelPageSize', pageSize.toString());
    }, [pageSize]);

    // Update localStorage when timezone changes
    useEffect(() => {
        localStorage.setItem('adminPanelTimezone', timezone);
    }, [timezone]);

    const fetchFilterOptions = async () => {
        try {
            const response = await api.get('/api/database/filter-options/');
            setFilterOptions(response.data);
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            let url = `/api/database/messages/?page=${page}&page_size=${pageSize}`;
            if (filters.server) url += `&server=${encodeURIComponent(filters.server)}`;
            if (filters.channel) url += `&channel=${encodeURIComponent(filters.channel)}`;
            if (filters.user) url += `&user=${encodeURIComponent(filters.user)}`;
            if (filters.date) {
                url += `&date=${encodeURIComponent(filters.date)}&timezone=${encodeURIComponent(timezone)}`;
            }
            if (filters.hasAttachment) url += '&has_attachment=true';
            if (filters.hasMention) url += '&has_mention=true';
            if (filters.hasEmoji) url += '&has_emoji=true';
            const response = await api.get(url);
            setMessages(response.data.results);
            setHasMore(response.data.next !== null);
            const total = Math.ceil(response.data.count / pageSize);
            setTotalPages(total);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString('en-US', {
            timeZone: timezone,
            dateStyle: 'medium',
            timeStyle: 'medium'
        });
    };

    const handleRowClick = (messageId) => {
        navigate(`/database/message/${messageId}`);
    };

    const handleSelectMessage = (messageId, event) => {
        event.stopPropagation(); // Prevent row click when clicking checkbox
        setSelectedMessages(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(messageId)) {
                newSelected.delete(messageId);
            } else {
                newSelected.add(messageId);
            }
            return newSelected;
        });
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedMessages(new Set(messages.map(m => m.id)));
        } else {
            setSelectedMessages(new Set());
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedMessages.size === 0) return;

        if (window.confirm(`Are you sure you want to delete ${selectedMessages.size} messages?`)) {
            setIsDeleting(true);
            try {
                await Promise.all(
                    Array.from(selectedMessages).map(id =>
                        api.delete(`/api/database/messages/${id}/`)
                    )
                );
                setSelectedMessages(new Set());
                fetchMessages();
            } catch (error) {
                console.error('Error deleting messages:', error);
                alert('Failed to delete messages');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleRefresh = () => {
        // Clear localStorage on refresh
        localStorage.removeItem('adminPanelFilters');
        localStorage.removeItem('adminPanelPageSize');
        setFilters({
            server: '',
            channel: '',
            user: '',
            date: '',
            hasAttachment: false,
            hasMention: false,
            hasEmoji: false
        });
        setPageSize(50);
        fetchMessages();
    };

    const PaginationControls = () => (
        <div className="pagination-container">
            <div className="button-row">
                <button
                    onClick={handleRefresh}
                    className="button blue-button"
                >
                    Refresh
                </button>
                <button
                    onClick={handleDeleteSelected}
                    disabled={selectedMessages.size === 0 || isDeleting}
                    className="button red-button"
                >
                    {isDeleting ? 'Deleting...' : `Delete ${selectedMessages.size || ''} Messages`}
                </button>
            </div>
            <div className="pagination-controls">
                <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                    className="pagination-button"
                >
                    <span className="arrow">←</span>
                </button>
                <span className="page-info">Page {page} of {totalPages}</span>
                <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore}
                    className="pagination-button"
                >
                    <span className="arrow">→</span>
                </button>
            </div>
            <div className="page-size-selector">
                <label>Items per page:</label>
                <select
                    value={pageSize}
                    onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                    }}
                >
                    {pageSizeOptions.map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>
        </div>
    );

    const FilterControls = () => {
        const channelCategories = getChannelCategories();

        // Get all categorized channels
        const allCategorizedChannels = channelCategories.flatMap(cat => cat.channels);

        // Get unknown channels (channels that exist in filterOptions but not in CONFIG categories)
        const unknownChannels = filterOptions.channels
            .filter(c => !allCategorizedChannels.includes(c))
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        return (
            <div className="filter-container">
                <div className="filter-controls">
                    <div className="filter-select">
                        <label>Timezone:</label>
                        <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                        >
                            {timezones.map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-select">
                        <label>Date:</label>
                        <input
                            type="date"
                            value={filters.date}
                            onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))}
                            className="date-input"
                        />
                    </div>
                    <div className="filter-select">
                        <label>Server:</label>
                        <select
                            value={filters.server}
                            onChange={(e) => setFilters(f => ({ ...f, server: e.target.value }))}
                        >
                            <option value="">All Servers</option>
                            {filterOptions.servers.map(server => (
                                <option key={server} value={server}>{server}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-select">
                        <label>Channel:</label>
                        <select
                            value={filters.channel}
                            onChange={(e) => setFilters(f => ({ ...f, channel: e.target.value }))}
                        >
                            <option value="">All Channels</option>
                            {channelCategories.map(({ name, channels }) => (
                                <optgroup key={name} label={name.toUpperCase()}>
                                    {channels.map(channel => (
                                        <option key={channel} value={channel}>{channel}</option>
                                    ))}
                                </optgroup>
                            ))}
                            {unknownChannels.length > 0 && (
                                <optgroup label="UNCATEGORIZED">
                                    {unknownChannels.map(channel => (
                                        <option key={channel} value={channel}>{channel}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>
                    <div className="filter-select">
                        <label>User:</label>
                        <select
                            value={filters.user}
                            onChange={(e) => setFilters(f => ({ ...f, user: e.target.value }))}
                        >
                            <option value="">All Users</option>
                            {filterOptions.users.map(user => (
                                <option key={user} value={user}>{user}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-select">
                        <div className="toggle-container">
                            <label className="toggle">
                                Contains Attachment
                                <input
                                    type="checkbox"
                                    checked={filters.hasAttachment}
                                    onChange={(e) => setFilters(f => ({ ...f, hasAttachment: e.target.checked }))}
                                />
                                <span className="custom-checkbox"></span>
                            </label>
                        </div>
                        <div className="toggle-container">
                            <label className="toggle">
                                Contains Mention
                                <input
                                    type="checkbox"
                                    checked={filters.hasMention}
                                    onChange={(e) => setFilters(f => ({ ...f, hasMention: e.target.checked }))}
                                />
                                <span className="custom-checkbox"></span>
                            </label>
                        </div>
                        <div className="toggle-container">
                            <label className="toggle">
                                Contains Emoji
                                <input
                                    type="checkbox"
                                    checked={filters.hasEmoji}
                                    onChange={(e) => setFilters(f => ({ ...f, hasEmoji: e.target.checked }))}
                                />
                                <span className="custom-checkbox"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && page === 1) return (
        <div className="admin-loading-container">
            <LoadingIndicator />
        </div>
    );

    return (
        <div className="admin-panel fade-in">
            <FilterControls />
            <div className="content-section">
                <PaginationControls />
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selectedMessages.size === messages.length && messages.length > 0}
                                    />
                                </th>
                                <th>Timestamp</th>
                                {/* <th>Server</th> */}
                                <th>Channel</th>
                                <th>User</th>
                                <th>Content</th>
                                <th>Words</th>
                                <th>Chars</th>
                                <th>📎</th>
                                <th>@</th>
                                <th>😀</th>
                            </tr>
                        </thead>
                        <tbody>
                            {messages.map((message) => (
                                <tr
                                    key={message.id}
                                    onClick={() => handleRowClick(message.id)}
                                    className={`clickable-row ${selectedMessages.has(message.id) ? 'selected' : ''}`}
                                >
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedMessages.has(message.id)}
                                            onChange={(e) => handleSelectMessage(message.id, e)}
                                        />
                                    </td>
                                    <td>{formatDate(message.timestamp)}</td>
                                    {/* <td>{message.server_name}</td> */}
                                    <td>{message.channel_name}</td>
                                    <td>{message.user_name}</td>
                                    <td>{message.message_content}</td>
                                    <td>{message.word_count}</td>
                                    <td>{message.char_count}</td>
                                    <td>{message.contains_attachment ? '✓' : ''}</td>
                                    <td>{message.contains_mention ? '✓' : ''}</td>
                                    <td>{message.contains_emoji ? '✓' : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <PaginationControls />
            </div>
        </div>
    );
};

export default Database;