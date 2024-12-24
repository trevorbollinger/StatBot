export const calculatePercentage = (value, total) => {
    return total > 0 ? (value / total) * 100 : 0;
};

export const calculateAvgCharsPerMessage = (chars, messages) => {
    if (!messages || messages === 0) return '0';
    return (chars / messages).toFixed(1);
};

export const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
};

export const sortItems = (items, sortConfig, messageStats) => {
    if (!items || !messageStats) return [];
    
    return [...items].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        switch (sortConfig.key) {
            case 'percent_messages':
                aValue = calculatePercentage(a.message_count, messageStats.total_messages);
                bValue = calculatePercentage(b.message_count, messageStats.total_messages);
                break;
            case 'percent_words':
                aValue = calculatePercentage(a.total_words, messageStats.total_words);
                bValue = calculatePercentage(b.total_words, messageStats.total_words);
                break;
            case 'percent_characters':
                aValue = calculatePercentage(a.total_characters, messageStats.total_characters);
                bValue = calculatePercentage(b.total_characters, messageStats.total_characters);
                break;
            case 'characters_per_message':
            case 'words_per_message':
                aValue = sortConfig.key === 'words_per_message' 
                    ? a.total_words / (a.message_count || 1)
                    : a.total_characters / (a.message_count || 1);
                bValue = sortConfig.key === 'words_per_message'
                    ? b.total_words / (b.message_count || 1)
                    : b.total_characters / (b.message_count || 1);
                break;
        }

        return sortConfig.direction === 'ascending' 
            ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0)
            : (aValue > bValue ? -1 : aValue < bValue ? 1 : 0);
    });
};

export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
    }
};

export const handleCopyWithToast = (value, raw = false, setToast) => {
    if (value === null || value === undefined) return;
    
    const textToCopy = raw ? value : value.toLocaleString();
    navigator.clipboard.writeText(textToCopy).then(() => {
        setToast('Copied to clipboard');
        setTimeout(() => setToast(null), 3000);
    }).catch(err => {
        setToast('Failed to copy');
        setTimeout(() => setToast(null), 3000);
    });
};