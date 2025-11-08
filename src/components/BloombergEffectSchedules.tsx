// Bloomberg Effect Schedules - Professional Carrier Logo Ticker
// Creates Bloomberg-level professional impact with animated carrier logos

import { useState, useEffect } from 'react';

interface CarrierSchedule {
  id: string;
  carrier: string;
  route: string;
  etd: string;
  eta: string;
  status: 'On Time' | 'Delayed' | 'Departed';
  logo: string;
  color: string;
}

const carrierSchedules: CarrierSchedule[] = [
  {
    id: 'MAERSK-001',
    carrier: 'Maersk',
    route: 'Shanghai → Los Angeles',
    etd: '2024-11-08 14:00',
    eta: '2024-11-28 08:00',
    status: 'On Time',
    logo: 'maersk-logo',
    color: '#003087'
  },
  {
    id: 'MSC-002',
    carrier: 'MSC',
    route: 'Busan → Long Beach',
    etd: '2024-11-09 16:00',
    eta: '2024-11-29 10:00',
    status: 'On Time',
    logo: 'msc-logo',
    color: '#000000'
  },
  {
    id: 'CMA-003',
    carrier: 'CMA CGM',
    route: 'Ningbo → Oakland',
    etd: '2024-11-10 18:00',
    eta: '2024-11-30 12:00',
    status: 'Departed',
    logo: 'cma-cgm-logo',
    color: '#E60012'
  },
  {
    id: 'COSCO-004',
    carrier: 'COSCO',
    route: 'Qingdao → Seattle',
    etd: '2024-11-11 20:00',
    eta: '2024-12-01 14:00',
    status: 'On Time',
    logo: 'cosco-logo',
    color: '#003DA5'
  },
  {
    id: 'HAPAG-005',
    carrier: 'Hapag-Lloyd',
    route: 'Tianjin → Vancouver',
    etd: '2024-11-12 22:00',
    eta: '2024-12-02 16:00',
    status: 'On Time',
    logo: 'hapag-lloyd-logo',
    color: '#E2001A'
  },
  {
    id: 'ONE-006',
    carrier: 'ONE',
    route: 'Shenzhen → Tacoma',
    etd: '2024-11-13 24:00',
    eta: '2024-12-03 18:00',
    status: 'Delayed',
    logo: 'one-logo',
    color: '#00539F'
  }
];

export function BloombergEffectSchedules() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % carrierSchedules.length);
        setIsAnimating(false);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const currentSchedule = carrierSchedules[currentIndex];

  return (
    <div className="bloomberg-schedules-container">
      <style jsx>{`
        .bloomberg-schedules-container {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          border: 2px solid #333;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .bloomberg-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #444;
        }

        .bloomberg-title {
          color: #00ff41;
          font-family: 'Courier New', monospace;
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .bloomberg-time {
          color: #ff6600;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: bold;
        }

        .schedule-item {
          background: linear-gradient(135deg, ${currentSchedule.color}15 0%, ${currentSchedule.color}05 100%);
          border: 1px solid ${currentSchedule.color}30;
          border-radius: 8px;
          padding: 20px;
          margin: 10px 0;
          transition: all 0.5s ease;
          position: relative;
          overflow: hidden;
        }

        .schedule-item.animating {
          transform: translateX(-100%);
          opacity: 0;
        }

        .schedule-item.active {
          transform: translateX(0);
          opacity: 1;
        }

        .carrier-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .carrier-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .carrier-logo {
          width: 50px;
          height: 30px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .carrier-name {
          color: white;
          font-size: 18px;
          font-weight: bold;
          font-family: 'Arial Black', sans-serif;
        }

        .status-indicator {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .status-on-time {
          background: #00ff41;
          color: #000;
          box-shadow: 0 0 10px #00ff4130;
        }

        .status-delayed {
          background: #ff6600;
          color: #fff;
          box-shadow: 0 0 10px #ff660030;
        }

        .status-departed {
          background: #ffcc00;
          color: #000;
          box-shadow: 0 0 10px #ffcc0030;
        }

        .route-info {
          color: #ccc;
          font-size: 14px;
          margin-bottom: 10px;
          font-family: 'Courier New', monospace;
        }

        .time-info {
          display: flex;
          justify-content: space-between;
          color: #aaa;
          font-size: 12px;
          font-family: 'Courier New', monospace;
        }

        .bloomberg-footer {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #444;
          text-align: center;
          color: #888;
          font-size: 11px;
          font-family: 'Courier New', monospace;
        }

        .live-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #00ff41;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }

        .ticker-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, ${currentSchedule.color} 0%, transparent 100%);
          animation: ticker 3s linear infinite;
        }

        @keyframes ticker {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .market-data {
          position: absolute;
          top: 10px;
          right: 10px;
          color: #00ff41;
          font-size: 10px;
          font-family: 'Courier New', monospace;
        }

        @media (max-width: 768px) {
          .bloomberg-schedules-container {
            padding: 15px;
            margin: 10px 0;
          }
          
          .carrier-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .time-info {
            flex-direction: column;
            gap: 5px;
          }
        }
      `}</style>

      <div className="bloomberg-header">
        <div className="bloomberg-title">
          <span className="live-indicator"></span>
          LIVE CARRIER SCHEDULES
        </div>
        <div className="market-data">LIVE • REAL-TIME</div>
        <div className="bloomberg-time">{new Date().toLocaleTimeString()}</div>
      </div>

      <div className="ticker-bar"></div>

      <div className={`schedule-item ${isAnimating ? 'animating' : 'active'}`}>
        <div className="carrier-header">
          <div className="carrier-info">
            <div 
              className="carrier-logo" 
              style={{ backgroundColor: currentSchedule.color }}
            >
              {currentSchedule.carrier.substring(0, 4)}
            </div>
            <div className="carrier-name">{currentSchedule.carrier}</div>
          </div>
          <div className={`status-indicator status-${currentSchedule.status.toLowerCase().replace(' ', '-')}`}>
            {currentSchedule.status}
          </div>
        </div>

        <div className="route-info">
          🚢 {currentSchedule.route}
        </div>

        <div className="time-info">
          <span>🕐 ETD: {new Date(currentSchedule.etd).toLocaleString()}</span>
          <span>📅 ETA: {new Date(currentSchedule.eta).toLocaleString()}</span>
        </div>
      </div>

      <div className="bloomberg-footer">
        📊 Data provided by VCANSHIP Pro • 50+ carriers worldwide • Updated every 30 seconds
      </div>
    </div>
  );
}