
import { useEffect, useState } from "react";
import MetricCard from "./components/MetricCard";
import ThresholdControl from "./components/ThresholdControl";
import StatusBadge from "./components/StatusBadge";
import "./App.css";

function App() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [latencyLimit, setLatencyLimit] = useState(200);
  const [errorRateLimit, setErrorRateLimit] = useState(5);

  // Simulate initial API request
  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics({
        latency: 145,
        errorRate: 2.4,
        requests: 850,
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Simulate different API responses
  function loadDashboard(mode) {
    setLoading(true);
    setError("");
    setMetrics(null);

    setTimeout(() => {
      setLoading(false);

      if (mode === "error") {
        setError("Unable to connect to the monitoring API.");
      } else if (mode === "empty") {
        setMetrics(null);
      } else {
        setMetrics({
          latency: 145,
          errorRate: 2.4,
          requests: 850,
        });
      }
    }, 1000);
  }

  if (loading) {
    return <h2 className="message">Loading monitoring data...</h2>;
  }

  if (error) {
    return (
      <div className="message">
        <h2 className="error">{error}</h2>
        <button onClick={() => loadDashboard("success")}>
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="message">
        <h2>No monitoring data available.</h2>
        <button onClick={() => loadDashboard("success")}>
          Reload Data
        </button>
      </div>
    );
  }

  const status =
    metrics.latency > latencyLimit ||
    metrics.errorRate > errorRateLimit
      ? "Warning"
      : "Healthy";

  return (
    <div className="dashboard">
      <header>
        <div>
          <h1>API Monitoring Dashboard</h1>
          <p>Monitor API performance and reliability</p>
        </div>
        <StatusBadge status={status} />
      </header>

      <section className="metrics-grid">
        <MetricCard
          title="Average Latency"
          value={metrics.latency}
          unit="ms"
          description="Average API response time"
        />

        <MetricCard
          title="Error Rate"
          value={metrics.errorRate}
          unit="%"
          description="Percentage of failed requests"
        />

        <MetricCard
          title="Requests"
          value={metrics.requests}
          unit="rpm"
          description="Requests per minute"
        />
      </section>

      <section className="threshold-section">
        <h2>Alert Thresholds</h2>

        <ThresholdControl
          label="Maximum Latency"
          value={latencyLimit}
          unit="ms"
          onChange={setLatencyLimit}
        />

        <ThresholdControl
          label="Maximum Error Rate"
          value={errorRateLimit}
          unit="%"
          onChange={setErrorRateLimit}
        />
      </section>

      <section className="demo-controls">
        <h2>Testing Controls</h2>

        <button onClick={() => loadDashboard("success")}>
          Load Data
        </button>

        <button onClick={() => loadDashboard("empty")}>
          Simulate Empty State
        </button>

        <button onClick={() => loadDashboard("error")}>
          Simulate API Failure
        </button>
      </section>
    </div>
  );
}

export default App;
