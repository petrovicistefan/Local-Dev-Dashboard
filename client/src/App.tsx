import { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Database, Activity, RefreshCw, Container, CheckCircle2, XCircle, AlertCircle, Sparkles, Search, Filter, Maximize2, Minimize2 } from 'lucide-react';
import './App.css';

interface Service {
  id: string;
  name: string;
  image?: string;
  status: string;
  type: 'docker' | 'database' | 'ai-model';
}

const socket = io('http://localhost:3001');
const REFRESH_INTERVAL = 20000;

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'docker' | 'database' | 'ai-model'>('all');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('service-update', (data: Service[]) => {
      setServices(data);
      setProgress(0); // Reset progress on update
    });

    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);

    // Progress bar animation logic
    const tickRate = 100; // ms
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + (tickRate / REFRESH_INTERVAL) * 100;
      });
    }, tickRate);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('service-update');
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      clearInterval(timer);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (s.image && s.image.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = activeFilter === 'all' || s.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [services, searchQuery, activeFilter]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return <CheckCircle2 className="status-icon running" size={20} />;
      case 'loaded':
        return <CheckCircle2 className="status-icon loaded" size={20} />;
      case 'stopped':
      case 'exited':
        return <XCircle className="status-icon stopped" size={20} />;
      default:
        return <AlertCircle className="status-icon warning" size={20} />;
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'docker': return <Container size={24} />;
      case 'database': return <Database size={24} />;
      case 'ai-model': return <Sparkles size={24} className="ai-icon" />;
      default: return <Activity size={24} />;
    }
  };

  return (
    <div className={`dashboard ${isFullScreen ? 'tv-mode' : ''}`}>
      <div className="top-progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
      
      <header className="dashboard-header">
        <div className="header-top">
          <div className="header-content">
            <Activity className="logo-icon" />
            <h1>Local Dev Dashboard</h1>
          </div>
          <div className="header-actions">
            <button onClick={toggleFullScreen} className="icon-button" title="TV Mode">
              {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <div className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? 'Live' : 'Disconnected'}
            </div>
          </div>
        </div>

        {!isFullScreen && (
          <div className="controls-row">
            <div className="search-container">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search models, containers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-pills">
              {(['all', 'docker', 'database', 'ai-model'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`filter-pill ${activeFilter === f ? 'active' : ''}`}
                >
                  {f.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="dashboard-grid">
        {services.length === 0 && (
          <div className="empty-state">
            <RefreshCw className="spin" />
            <p>Scanning for services...</p>
          </div>
        )}

        {services.length > 0 && filteredServices.length === 0 && (
          <div className="empty-state">
            <Filter size={48} />
            <p>No services match your filters</p>
          </div>
        )}
        
        {filteredServices.map((service) => (
          <div key={service.id + service.name} className={`service-card ${service.status} ${service.type}`}>
            <div className="card-header">
              {getServiceIcon(service.type)}
              <span className="service-type">{service.type.replace('-', ' ')}</span>
            </div>
            
            <div className="card-body">
              <h3>{service.name}</h3>
              {service.image && <p className="image-name">{service.image}</p>}
            </div>

            <div className="card-footer">
              <div className="status-wrapper">
                {getStatusIcon(service.status)}
                <span className="status-text">{service.status}</span>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

export default App;
