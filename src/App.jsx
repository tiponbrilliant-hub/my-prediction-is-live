import { useEffect, useState } from "react";

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_KEY = import.meta.env.VITE_API_KEY;
  const BASE_URL = "https://v3.football.api-sports.io";

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch(`${BASE_URL}/fixtures?live=all`, {
          headers: {
            "x-apisports-key": API_KEY,
          },
        });

        const data = await res.json();
        console.log("LIVE DATA:", data);

        setMatches(data.response || []);
      } catch (error) {
        console.error("ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Prediction Dashboard</h1>

      {loading && <p>Loading matches...</p>}

      {!loading && matches.length === 0 && (
        <p>No live matches currently ⚽</p>
      )}

      {matches.map((match, index) => (
        <div
          key={index}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            margin: "10px 0",
            borderRadius: "8px",
          }}
        >
          <h3>
            {match.teams.home.name} vs {match.teams.away.name}
          </h3>

          <p>
            Time:{" "}
            {new Date(match.fixture.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <p>Status: {match.fixture.status.short}</p>
        </div>
      ))}
    </div>
  );
}

export default App;