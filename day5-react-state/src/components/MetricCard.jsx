
function MetricCard({ title, value, unit, description }) {
  return (
    <div className="metric-card">
      <h3>{title}</h3>
      <p className="metric-value">
        {value} <span>{unit}</span>
      </p>
      <small>{description}</small>
    </div>
  );
}

export default MetricCard;
