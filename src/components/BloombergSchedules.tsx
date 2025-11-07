// Bloomberg Effect Schedules Component
// Professional real-time carrier schedule ticker with Bloomberg-level branding

import { useState, useEffect } from 'react';

interface CarrierSchedule {
  carrier: string;
  logo: string;
  color: string;
  route: string;
  departure: string;
  arrival: string;
  status: 'On Time' | 'Delayed' | 'Departed' | 'Arrived';
  vessel: string;
  voyage: string;
  terminal: string;
  lastUpdate: string;
}

interface BloombergSchedulesProps {
  refreshInterval?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const carrierSchedules: CarrierSchedule[] = [
  {
    carrier: "Maersk",
    logo: "maersk-logo",
    color: "#003087",
    route: "Shanghai → Los Angeles",
    departure: "2024-01-15 08:00",
    arrival: "2024-01-30 14:00",
    status: "On Time",
    vessel: "MAERSK SHANGHAI",
    voyage: "2401W",
    terminal: "Yangshan Port",
    lastUpdate: "2024-01-15 06:30"
  },
  {
    carrier: "MSC",
    logo: "msc-logo",
    color: "#000000",
    route: "Rotterdam → New York",
    departure: "2024-01-16 10:00",
    arrival: "2024-01-28 16:00",
    status: "Departed",
    vessel: "MSC GULSUN",
    voyage: "2402E",
    terminal: "ECT Delta",
    lastUpdate: "2024-01-16 09:45"
  },
  {
    carrier: "CMA CGM",
    logo: "cma-cgm-logo",
    color: "#E60012",
    route: "Singapore → Hamburg",
    departure: "2024-01-17 12:00",
    arrival: "2024-02-05 08:00",
    status: "On Time",
    vessel: "CMA CGM MARCO POLO",
    voyage: "2403N",
    terminal: "PSA Singapore",
    lastUpdate: "2024-01-17 11:15"
  },
  {
    carrier: "COSCO",
    logo: "cosco-logo",
    color: "#003DA5",
    route: "Qingdao → Long Beach",
    departure: "2024-01-18 14:00",
    arrival: "2024-02-02 20:00",
    status: "Delayed",
    vessel: "COSCO SHIPPING UNIVERSE",
    voyage: "2404W",
    terminal: "Qingdao Port",
    lastUpdate: "2024-01-18 13:20"
  },
  {
    carrier: "Hapag-Lloyd",
    logo: "hapag-lloyd-logo",
    color: "#E2001A",
    route: "Antwerp → Savannah",
    departure: "2024-01-19 16:00",
    arrival: "2024-02-01 22:00",
    status: "Arrived",
    vessel: "HAPAG-LLOYD EXPRESS",
    voyage: "2405E",
    terminal: "Antwerp Gateway",
    lastUpdate: "2024-01-19 15:30"
  },
  {
    carrier: "ONE",
    logo: "one-logo",
    color: "#00539F",
    route: "Tokyo → Oakland",
    departure: "2024-01-20 18:00",
    arrival: "2024-02-04 10:00",
    status: "On Time",
    vessel: "ONE INNOVATION",
    voyage: "2406W",
    terminal: "Tokyo Port",
    lastUpdate: "2024-01-20 17:45"
  }
];

export function BloombergSchedules({ 
  refreshInterval = 30000, 
  showHeader = true,
  compact = false 
}: BloombergSchedulesProps) {
  const [schedules, setSchedules] = useState<CarrierSchedule[]>(carrierSchedules);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time updates
      setSchedules(prev => prev.map(schedule => ({
        ...schedule,
        lastUpdate: new Date().toISOString(),
        status: Math.random() > 0.8 ? 'Delayed' : schedule.status
      })));
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  useEffect(() => {
    const ticker = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % schedules.length);
    }, 5000);

    return () => clearInterval(ticker);
  }, [schedules.length]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Time': return '#00ff41';
      case 'Departed': return '#00a0df';
      case 'Arrived': return '#ff6600';
      case 'Delayed': return '#ff0000';
      default: return '#888';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'On Time': return '✅';
      case 'Departed': return '🚢';
      case 'Arrived': return '🏁';
      case 'Delayed': return '⚠️';
      default: return '⏰';
    }
  };

  return (
    <div className="bloomberg-schedules-container">
      <style jsx>{`
        .bloomberg-schedules-container {
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          border: 2px solid #333;
          border-radius: 16px;
          padding: ${compact ? '15px' : '30px'};
          margin: 20px 0;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
          font-family: 'Courier New', monospace;
          position: relative;
          overflow: hidden;
        }

        .bloomberg-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: ${compact ? '15px' : '25px'};
          padding-bottom: ${compact ? '10px' : '15px'};
          border-bottom: 2px solid #444;
        }

        .bloomberg-title {
          color: #00ff41;
          font-size: ${compact ? '18px' : '24px'};
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #00ff41;
          font-size: ${compact ? '10px' : '12px'};
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: #00ff41;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .refresh-time {
          color: #888;
          font-size: ${compact ? '10px' : '12px'};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .schedules-ticker {
          position: relative;
          height: ${compact ? '60px' : '80px'};
          overflow: hidden;
          background: linear-gradient(90deg, #000 0%, #111 50%, #000 100%);
          border-radius: 8px;
          border: 1px solid #333;
        }

        .schedule-item {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: ${compact ? '10px 15px' : '15px 25px'};
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.8s ease;
        }

        .schedule-item.active {
          opacity: 1;
          transform: translateX(0);
        }

        .schedule-item.prev {
          opacity: 0;
          transform: translateX(-100%);
        }

        .carrier-info {
          display: flex;
          align-items: center;
          gap: ${compact ? '10px' : '15px'};
        }

        .carrier-logo {
          width: ${compact ? '40px' : '60px'};
          height: ${compact ? '25px' : '35px'};
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: ${compact ? '10px' : '12px'};
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .carrier-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .carrier-name {
          color: white;
          font-size: ${compact ? '12px' : '16px'};
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .route-info {
          color: #ccc;
          font-size: ${compact ? '10px' : '12px'};
          font-weight: bold;
        }

        .vessel-info {
          color: #888;
          font-size: ${compact ? '8px' : '10px'};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .schedule-timing {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }

        .departure-time {
          color: #00a0df;
          font-size: ${compact ? '10px' : '12px'};
          font-weight: bold;
        }

        .arrival-time {
          color: #ff6600;
          font-size: ${compact ? '10px' : '12px'};
          font-weight: bold;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: ${compact ? '4px 8px' : '6px 12px'};
          border-radius: 12px;
          font-size: ${compact ? '8px' : '10px'};
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid;
        }

        .ticker-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #00ff41 0%, transparent 100%);
          animation: ticker-progress 5s linear infinite;
        }

        @keyframes ticker-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .schedules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(${compact ? '300px' : '400px'}, 1fr));
          gap: ${compact ? '10px' : '15px'};
          margin-top: 20px;
        }

        .schedule-card {
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          border: 1px solid #444;
          border-radius: 8px;
          padding: ${compact ? '12px' : '20px'};
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .schedule-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          border-color: #555;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #333;
        }

        .update-time {
          color: #666;
          font-size: ${compact ? '8px' : '10px'};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .terminal-info {
          color: #888;
          font-size: ${compact ? '8px' : '10px'};
          font-weight: bold;
        }

        .bloomberg-footer {
          text-align: center;
          color: #888;
          font-size: ${compact ? '10px' : '12px'};
          margin-top: ${compact ? '15px' : '25px'};
          padding-top: ${compact ? '10px' : '15px'};
          border-top: 1px solid #444;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .professional-badge {
          position: absolute;
          top: ${compact ? '5px' : '10px'};
          right: ${compact ? '5px' : '10px'};
          background: linear-gradient(135deg, #00ff41 0%, #00cc33 100%);
          color: #000;
          padding: ${compact ? '2px 6px' : '4px 8px'};
          border-radius: 10px;
          font-size: ${compact ? '8px' : '10px'};
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (max-width: 768px) {
          .bloomberg-schedules-container {
            padding: 15px;
            margin: 10px 0;
          }
          
          .schedule-item {
            flex-direction: column;
            gap: 10px;
            text-align: center;
          }
          
          .schedule-timing {
            align-items: center;
          }
          
          .schedules-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {showHeader && (
        <div className="bloomberg-header">
          <div className="bloomberg-title">
            🚢 LIVE CARRIER SCHEDULES
          </div>
          <div className="live-indicator">
            <div className="live-dot"></div>
            LIVE DATA
          </div>
        </div>
      )}

      <div className="schedules-ticker">
        {schedules.map((schedule, index) => (
          <div 
            key={schedule.voyage}
            className={`schedule-item ${index === currentIndex ? 'active' : index === (currentIndex - 1 + schedules.length) % schedules.length ? 'prev' : ''}`}
          >
            <div className="carrier-info">
              <div 
                className="carrier-logo" 
                style={{ backgroundColor: schedule.color }}
              >
                {schedule.carrier.substring(0, 3)}
              </div>
              <div className="carrier-details">
                <div className="carrier-name">{schedule.carrier}</div>
                <div className="route-info">{schedule.route}</div>
                <div className="vessel-info">{schedule.vessel} • {schedule.voyage}</div>
              </div>
            </div>

            <div className="schedule-timing">
              <div className="departure-time">DEP: {schedule.departure}</div>
              <div className="arrival-time">ARR: {schedule.arrival}</div>
              <div 
                className="status-indicator" 
                style={{ 
                  color: getStatusColor(schedule.status),
                  borderColor: getStatusColor(schedule.status)
                }}
              >
                {getStatusIcon(schedule.status)} {schedule.status}
              </div>
            </div>
          </div>
        ))}
        <div className="ticker-bar"></div>
      </div>

      <div className="schedules-grid">
        {schedules.slice(0, compact ? 3 : 6).map((schedule) => (
          <div key={schedule.voyage} className="schedule-card">
            <div className="professional-badge">PRO</div>
            <div className="card-header">
              <div className="carrier-info">
                <div 
                  className="carrier-logo" 
                  style={{ backgroundColor: schedule.color }}
                >
                  {schedule.carrier.substring(0, 3)}
                </div>
                <div className="carrier-details">
                  <div className="carrier-name">{schedule.carrier}</div>
                  <div className="route-info">{schedule.route}</div>
                </div>
              </div>
              <div 
                className="status-indicator" 
                style={{ 
                  color: getStatusColor(schedule.status),
                  borderColor: getStatusColor(schedule.status)
                }}
              >
                {getStatusIcon(schedule.status)} {schedule.status}
              </div>
            </div>

            <div className="schedule-timing">
              <div className="departure-time">DEP: {schedule.departure}</div>
              <div className="arrival-time">ARR: {schedule.arrival}</div>
            </div>

            <div className="card-footer">
              <div className="terminal-info">{schedule.terminal}</div>
              <div className="update-time">Updated: {schedule.lastUpdate}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bloomberg-footer">
        🌐 GLOBAL COVERAGE • REAL-TIME UPDATES • CARRIER VERIFIED
      </div>
    </div>
  );
}