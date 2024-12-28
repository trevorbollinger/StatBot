import React, { useState } from "react";
import api from "../api";
import "../styles/Random.css";

const Random = () => {
  const [averageMessage, setAverageMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAverageMessage = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/stats/average-message/");
      if (
        !response.data.average_message_chars ||
        !response.data.average_message_words
      ) {
        throw new Error("Invalid response format");
      }
      setAverageMessage(response.data);
    } catch (error) {
      console.error("Error details:", error);
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="rand-container">
      <button
        onClick={fetchAverageMessage}
        disabled={loading}
        className="button blue-button"
      >
        {loading ? "Loading..." : "Generate Average Message"}
      </button>

      {error && <div className="alert alert-danger">Error: {error}</div>}

      {averageMessage && (
        <div className="results">
          <div className="row">
            <div className="col-md-6">
              <div className="stats-card mb-3">
                <div className="stats-card-body">
                  <pre className="message-box">
                    {JSON.stringify(
                      averageMessage.average_message_chars,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="stats-card mb-3">
                <div className="stats-card-body">
                  <pre className="message-box">
                    {JSON.stringify(
                      averageMessage.average_message_words,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Random;
