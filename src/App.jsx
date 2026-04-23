import { useEffect, useState } from "react";

export default function App() {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_KEY = import.meta.env.VITE_API_KEY;
  const BASE_URL = "https://v3.football.api-sports.io";

  // ---------------- FETCH ----------------
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BASE_URL}/fixtures?live=all`, {
          headers: { "x-apisports-key": API_KEY },
        });

        const data = await res.json();
        const fixtures = (data?.response || []).slice(0, 6);

        const enriched = await Promise.all(
          fixtures.map(async (m) => {
            const home = await getStats(m.teams.home.id, m.league.id, m.league.season);
            const away = await getStats(m.teams.away.id, m.league.id, m.league.season);

            const prediction = model(home, away, m);

            return {
              match: m,
              prediction,
            };
          })
        );

        // ONLY QUALITY PICKS
        const filtered = enriched
          .filter((x) => x.prediction.confidence >= 55)
          .sort((a, b) => b.prediction.confidence - a.prediction.confidence);

        setPicks(filtered);
      } catch (err) {
        console.error(err);
        setPicks([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ---------------- TEAM STATS ----------------
  const getStats = async (teamId, league, season) => {
    try {
      const res = await fetch(
        `${BASE_URL}/teams/statistics?team=${teamId}&league=${league}&season=${season}`,
        {
          headers: { "x-apisports-key": API_KEY },
        }
      );

      const data = await res.json();
      return data?.response || null;
    } catch {
      return null;
    }
  };

  // ---------------- ADVANCED MODEL ----------------
  const model = (home, away) => {
    if (!home || !away) {
      return {
        confidence: 55,
        btts: "UNKNOWN",
        over25: "UNKNOWN",
        tag: "⚖️ Balanced",
      };
    }

    const hp = home.fixtures?.played?.total || 0;
    const hw = home.fixtures?.wins?.total || 0;

    const ap = away.fixtures?.played?.total || 0;
    const aw = away.fixtures?.wins?.total || 0;

    const homeRate = hp ? (hw / hp) * 100 : 50;
    const awayRate = ap ? (aw / ap) * 100 : 50;

    // base strength
    let confidence = (homeRate + awayRate) / 2;

    // form boost
    if (hp >= 8) confidence += 5;
    if (ap >= 8) confidence += 5;

    // dominance boost
    const diff = Math.abs(homeRate - awayRate);
    if (diff > 20) confidence += 8;
    if (diff > 30) confidence += 12;

    confidence = Math.min(Math.max(confidence, 45), 92);

    // ---------------- OVER/UNDER + BTTS HEURISTIC ----------------
    const avgGoals = (home.goals?.for?.total?.average || 1.2) +
                     (away.goals?.for?.total?.average || 1.2);

    const over25 = avgGoals >= 2.5 ? "YES" : "NO";
    const btts = avgGoals >= 2 ? "LIKELY" : "UNLIKELY";

    // TAGGING
    let tag = "⚖️ Moderate Pick";
    if (confidence >= 75) tag = "🔥 Strong Pick";
    else if (confidence >= 65) tag = "🟢 Good Pick";

    return {
      confidence: Math.round(confidence),
      homeRate,
      awayRate,
      over25,
      btts,
      tag,
    };
  };

  // ---------------- UI ----------------
  return (
    <div style={{ padding: 20, fontFamily: "Arial", background: "#f7f7f7" }}>
      <h1>🏆 Professional Prediction Platform</h1>

      {loading && <p>Analyzing matches...</p>}

      {!loading && picks.length === 0 && (
        <p>No strong picks available right now ⚽</p>
      )}

      {!loading &&
        picks.map((p, i) => (
          <div
            key={i}
            style={{
              background: "white",
              padding: 15,
              margin: "12px 0",
              borderRadius: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              borderLeft: "5px solid #2ecc71",
            }}
          >
            <h2>
              {p.match.teams.home.name} vs {p.match.teams.away.name}
            </h2>

            <p>
              ⏱{" "}
              {new Date(p.match.fixture.date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            <p>
              🏠 Home: {p.prediction.homeRate.toFixed(1)}% | Away:{" "}
              {p.prediction.awayRate.toFixed(1)}%
            </p>

            <p>📊 Over 2.5 Goals: {p.prediction.over25}</p>
            <p>⚽ BTTS: {p.prediction.btts}</p>

            <h3>🔥 Confidence: {p.prediction.confidence}%</h3>

            <p style={{ fontWeight: "bold" }}>{p.prediction.tag}</p>
          </div>
        ))}
    </div>
  );
}