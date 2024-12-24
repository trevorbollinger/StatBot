import axios from "axios"
import { ACCESS_TOKEN } from "./constants"
import { CONFIG } from './config.js'; 

const apiUrl = CONFIG.apiUrl;
console.log('API fart:', apiUrl); // Debug log

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true  // Add this line
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default api
