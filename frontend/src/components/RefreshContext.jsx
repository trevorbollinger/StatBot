import React, { createContext, useState, useContext } from 'react';

const RefreshContext = createContext();

export function RefreshProvider({ children }) {
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(1000);

    return (
        <RefreshContext.Provider value={{ 
            autoRefresh, 
            setAutoRefresh, 
            refreshInterval, 
            setRefreshInterval 
        }}>
            {children}
        </RefreshContext.Provider>
    );
}

export const useRefresh = () => useContext(RefreshContext);
