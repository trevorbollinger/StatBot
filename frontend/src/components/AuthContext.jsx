import React, { createContext, useContext, useState, useEffect } from 'react';
import { ACCESS_TOKEN } from '../constants';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthorized, setIsAuthorized] = useState(Boolean(localStorage.getItem(ACCESS_TOKEN)));
    const [username, setUsername] = useState(localStorage.getItem("username") || "");
    const [firstName, setFirstName] = useState(localStorage.getItem("first_name") || "");
    const [lastName, setLastName] = useState(localStorage.getItem("last_name") || "");
    const [isStaff, setIsStaff] = useState(false);
    const [isSuperuser, setIsSuperuser] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const currentTime = Date.now() / 1000;
                
                if (decodedToken.exp < currentTime) {
                    logout();
                } else {
                    setIsStaff(decodedToken.is_staff === true);
                    setIsSuperuser(decodedToken.is_superuser === true);
                }
            } catch (error) {
                logout();
            }
        } else {
            logout();
        }
    }, []);

    const login = (user, firstName, lastName) => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                setIsStaff(decodedToken.is_staff === true);
                setIsSuperuser(decodedToken.is_superuser === true);
            } catch (error) {
                console.error('Error decoding token:', error);
            }
        }
        setIsAuthorized(true);
        setUsername(user);
        setFirstName(firstName);
        setLastName(lastName);
        localStorage.setItem("username", user);
        localStorage.setItem("first_name", firstName);
        localStorage.setItem("last_name", lastName);
    };

    const logout = () => {
        localStorage.clear();
        setIsAuthorized(false);
        setUsername("");
        setFirstName("");
        setLastName("");
        setIsStaff(false);
        setIsSuperuser(false);
    };

    return (
        <AuthContext.Provider value={{ 
            isAuthorized, 
            username, 
            firstName, 
            lastName, 
            isStaff,
            isSuperuser,
            login, 
            logout 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export { AuthContext };
