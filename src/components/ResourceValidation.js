import React from 'react';
import './ResourceValidation.css';

const ResourceValidation = ({ validation }) => {
  if (!validation) return null;

  const { warnings, suggestions, resourceUsage } = validation;

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return '💡';
      default: return 'ℹ️';
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'error': return 'severity-error';
      case 'warning': return 'severity-warning';
      case 'info': return 'severity-info';
      default: return 'severity-default';
    }
  };

  const getUtilizationColor = (utilization) => {
    if (utilization > 100) return '#ef4444';
    if (utilization > 80) return '#f59e0b';
    if (utilization > 50) return '#10b981';
    return '#6b7280';
  };

  return (
    <div className="resource-validation">
      <h2>Resource Validation</h2>

      {warnings.length === 0 && suggestions.length === 0 && (
        <div className="validation-success">
          <span className="success-icon">✅</span>
          <span>Configuration is valid! No resource conflicts detected.</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="validation-section">
          <h3>⚠️ Warnings & Errors</h3>
          {warnings.map((warning, idx) => (
            <div key={idx} className={`validation-item ${getSeverityClass(warning.severity)}`}>
              <div className="validation-header">
                <span className="severity-icon">{getSeverityIcon(warning.severity)}</span>
                <span className="validation-message">{warning.message}</span>
              </div>
              <div className="validation-details">
                <div className="detail-row">
                  <strong>Impact:</strong> {warning.impact}
                </div>
                <div className="detail-row recommendation">
                  <strong>Recommendation:</strong> {warning.recommendation}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="validation-section">
          <h3>💡 Optimization Suggestions</h3>
          {suggestions.map((suggestion, idx) => (
            <div key={idx} className="validation-item severity-info">
              <div className="validation-header">
                <span className="severity-icon">💡</span>
                <span className="validation-message">{suggestion}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="resource-usage-section">
        <h3>📊 Resource Utilization</h3>
        <div className="resource-grid">
          <div className="resource-card">
            <div className="resource-header">
              <span className="resource-icon">📥</span>
              <span className="resource-title">IO Threads</span>
            </div>
            <div className="resource-stats">
              <div className="stat-row">
                <span>Required:</span>
                <span className="stat-value">{resourceUsage.ioThreads.required}</span>
              </div>
              {resourceUsage.ioThreads.breakdown && (
                <>
                  <div className="stat-row" style={{ fontSize: '12px', color: '#6b7280', marginLeft: '10px' }}>
                    <span>↳ Reading:</span>
                    <span className="stat-value">{resourceUsage.ioThreads.breakdown.reading}</span>
                  </div>
                  <div className="stat-row" style={{ fontSize: '12px', color: '#6b7280', marginLeft: '10px' }}>
                    <span>↳ Writing:</span>
                    <span className="stat-value">{resourceUsage.ioThreads.breakdown.writing}</span>
                  </div>
                </>
              )}
              <div className="stat-row">
                <span>Available:</span>
                <span className="stat-value">{resourceUsage.ioThreads.available}</span>
              </div>
              <div className="stat-row">
                <span>Utilization:</span>
                <span 
                  className="stat-value" 
                  style={{ color: getUtilizationColor(resourceUsage.ioThreads.utilization || 0) }}
                >
                  {(resourceUsage.ioThreads.utilization || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${Math.min(resourceUsage.ioThreads.utilization || 0, 100)}%`,
                  backgroundColor: getUtilizationColor(resourceUsage.ioThreads.utilization || 0)
                }}
              ></div>
            </div>
          </div>

          <div className="resource-card">
            <div className="resource-header">
              <span className="resource-icon">⚙️</span>
              <span className="resource-title">Worker Threads</span>
            </div>
            <div className="resource-stats">
              <div className="stat-row">
                <span>Required:</span>
                <span className="stat-value">{resourceUsage.workerThreads.required}</span>
              </div>
              {resourceUsage.workerThreads.breakdown && (
                <>
                  <div className="stat-row" style={{ fontSize: '12px', color: '#6b7280', marginLeft: '10px' }}>
                    <span>↳ Processing:</span>
                    <span className="stat-value">{resourceUsage.workerThreads.breakdown.processing}</span>
                  </div>
                </>
              )}
              <div className="stat-row">
                <span>Available:</span>
                <span className="stat-value">{resourceUsage.workerThreads.available}</span>
              </div>
              <div className="stat-row">
                <span>Utilization:</span>
                <span 
                  className="stat-value" 
                  style={{ color: getUtilizationColor(resourceUsage.workerThreads.utilization || 0) }}
                >
                  {(resourceUsage.workerThreads.utilization || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${Math.min(resourceUsage.workerThreads.utilization || 0, 100)}%`,
                  backgroundColor: getUtilizationColor(resourceUsage.workerThreads.utilization || 0)
                }}
              ></div>
            </div>
          </div>

          <div className="resource-card">
            <div className="resource-header">
              <span className="resource-icon">🗄️</span>
              <span className="resource-title">DB Connections</span>
            </div>
            <div className="resource-stats">
              <div className="stat-row">
                <span>Required:</span>
                <span className="stat-value">{resourceUsage.dbConnections.required}</span>
              </div>
              <div className="stat-row">
                <span>Available:</span>
                <span className="stat-value">{resourceUsage.dbConnections.available}</span>
              </div>
              <div className="stat-row">
                <span>Utilization:</span>
                <span 
                  className="stat-value" 
                  style={{ color: getUtilizationColor(resourceUsage.dbConnections.utilization || 0) }}
                >
                  {(resourceUsage.dbConnections.utilization || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${Math.min(resourceUsage.dbConnections.utilization || 0, 100)}%`,
                  backgroundColor: getUtilizationColor(resourceUsage.dbConnections.utilization || 0)
                }}
              ></div>
            </div>
          </div>

          <div className="resource-card">
            <div className="resource-header">
              <span className="resource-icon">🖥️</span>
              <span className="resource-title">CPU Cores</span>
            </div>
            <div className="resource-stats">
              <div className="stat-row">
                <span>Available:</span>
                <span className="stat-value">{resourceUsage.cpuCores.available}</span>
              </div>
              <div className="stat-row">
                <span>Optimal IO Threads:</span>
                <span className="stat-value">{resourceUsage.cpuCores.optimalIOThreads}</span>
              </div>
              <div className="stat-row">
                <span>Optimal Worker Threads:</span>
                <span className="stat-value">{resourceUsage.cpuCores.optimalWorkerThreads}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceValidation;
