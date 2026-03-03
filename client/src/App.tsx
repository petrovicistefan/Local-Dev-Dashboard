import { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Database, Activity, RefreshCw, Container, CheckCircle2, XCircle, AlertCircle, Sparkles, Search, Filter, Maximize2, Minimize2, GitBranch, Bell, BellOff, Play, Square, RotateCcw, Linkedin, Github, Coffee } from 'lucide-react';
import './App.css';

interface Service {
  id: string;
  name: string;
  image?: string;
  status: string;
  type: 'docker' | 'database' | 'ai-model' | 'git-repo';
}

interface Alert {
  title: string;
  message: string;
  type: 'error' | 'warning';
}

const socket = io('http://localhost:3001');
const REFRESH_INTERVAL = 20000;

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'docker' | 'database' | 'ai-model' | 'git-repo'>('all');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingService, setLoadingService] = useState<string | null>(null);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('service-update', (data: Service[]) => {
      setServices(data);
      setLoadingService(null);
      setProgress(0);
    });

    socket.on('service-alert', (alerts: Alert[]) => {
      setLoadingService(null);
      if (notificationsEnabled && Notification.permission === 'granted') {
        alerts.forEach(alert => {
          new Notification(alert.title, {
            body: alert.message,
            icon: '/vite.svg'
          });
        });
      }
    });

    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);

    const tickRate = 100;
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
      socket.off('service-alert');
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      clearInterval(timer);
    };
  }, [notificationsEnabled]);

  const handleAction = (id: string, type: string, action: string) => {
    setLoadingService(id);
    socket.emit('service-action', { id, type, action });
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

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
    const s = status.toLowerCase();
    if (s === 'running' || s === 'loaded' || s === 'clean') {
      return <CheckCircle2 className="status-icon running" size={20} />;
    }
    if (s === 'stopped' || s === 'exited') {
      return <XCircle className="status-icon stopped" size={20} />;
    }
    return <AlertCircle className="status-icon warning" size={20} />;
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'docker': return <Container size={24} />;
      case 'database': return <Database size={24} />;
      case 'ai-model': return <Sparkles size={24} className="ai-icon" />;
      case 'git-repo': return <GitBranch size={24} className="git-icon" />;
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
            <button 
              onClick={toggleNotifications} 
              className={`icon-button ${notificationsEnabled ? 'active' : ''}`}
              title={notificationsEnabled ? "Disable Notifications" : "Enable Notifications"}
            >
              {notificationsEnabled ? <Bell size={20} className="bell-active" /> : <BellOff size={20} />}
            </button>
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
                placeholder="Search projects, models, containers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-pills">
              {(['all', 'docker', 'database', 'ai-model', 'git-repo'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`filter-pill ${activeFilter === f ? 'active' : ''}`}
                >
                  {f === 'git-repo' ? 'projects' : f.replace('-', ' ')}
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
          <div key={service.id + service.name} className={`service-card ${service.status.includes('changes') ? 'dirty' : service.status} ${service.type}`}>
            <div className="card-header">
              <div className="header-left">
                {getServiceIcon(service.type)}
                <span className="service-type">{service.type.replace('-', ' ')}</span>
              </div>
              
              {service.type === 'docker' && !isFullScreen && (
                <div className="card-actions">
                  {service.status === 'running' ? (
                    <button 
                      onClick={() => handleAction(service.id, 'docker', 'stop')}
                      disabled={loadingService === service.id}
                      className="action-btn stop"
                      title="Stop Container"
                    >
                      <Square size={14} fill="currentColor" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleAction(service.id, 'docker', 'start')}
                      disabled={loadingService === service.id}
                      className="action-btn start"
                      title="Start Container"
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleAction(service.id, 'docker', 'restart')}
                    disabled={loadingService === service.id}
                    className="action-btn restart"
                    title="Restart Container"
                  >
                    <RotateCcw size={14} className={loadingService === service.id ? 'spin' : ''} />
                  </button>
                </div>
              )}
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

      {!isFullScreen && (
        <footer className="dashboard-footer">
          <div className="footer-links">
            <a href="https://www.linkedin.com/in/stefanpetrovici/" target="_blank" rel="noopener noreferrer" className="footer-link">
              <Linkedin size={18} />
              <span>Connect</span>
            </a>
            <a href="https://github.com/petrovicistefan" target="_blank" rel="noopener noreferrer" className="footer-link">
              <Github size={18} />
              <span>GitHub</span>
            </a>
            <a href="https://www.buymeacoffee.com/petrovicistefan" target="_blank" rel="noopener noreferrer" className="footer-link coffee">
              <Coffee size={18} />
              <span>Buy me a coffee</span>
            </a>
          </div>
          <p className="footer-tagline">Open Source • MIT Licensed</p>
        </footer>
      )}
    </div>
  );
}

export default App;
