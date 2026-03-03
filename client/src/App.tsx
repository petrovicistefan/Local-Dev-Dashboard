import { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Database, Activity, RefreshCw, Container, CheckCircle2, XCircle, AlertCircle, Sparkles, Search, Filter, Maximize2, Minimize2, GitBranch, Bell, BellOff, Play, Square, RotateCcw, Linkedin, Github, Coffee, Settings, X, Cpu, HardDrive } from 'lucide-react';
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

interface SystemMetrics {
  cpu: string;
  mem: string;
}

interface DashboardSettings {
  showDocker: boolean;
  showDatabases: boolean;
  showAIModels: boolean;
  showProjects: boolean;
}

const socket = io('http://localhost:3001');
const REFRESH_INTERVAL = 20000;

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [connected, setConnected] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({ cpu: '0', mem: '0' });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'docker' | 'database' | 'ai-model' | 'git-repo'>('all');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingService, setLoadingService] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    const saved = localStorage.getItem('dashboard-settings');
    return saved ? JSON.parse(saved) : {
      showDocker: true,
      showDatabases: true,
      showAIModels: true,
      showProjects: true
    };
  });

  useEffect(() => {
    localStorage.setItem('dashboard-settings', JSON.stringify(settings));
    socket.emit('update-settings', settings);
  }, [settings]);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('service-update', (data: Service[]) => {
      setServices(data);
      setLoadingService(null);
      setProgress(0);
    });

    socket.on('system-metrics', (data: SystemMetrics) => {
      setSystemMetrics(data);
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
      socket.off('system-metrics');
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
      // First check settings visibility
      if (s.type === 'docker' && !settings.showDocker) return false;
      if (s.type === 'database' && !settings.showDatabases) return false;
      if (s.type === 'ai-model' && !settings.showAIModels) return false;
      if (s.type === 'git-repo' && !settings.showProjects) return false;

      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (s.image && s.image.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = activeFilter === 'all' || s.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [services, searchQuery, activeFilter, settings]);

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
            
            <div className="metrics-bar">
              <div className="metric-item" title="Host CPU Load">
                <Cpu size={16} />
                <span>{systemMetrics.cpu}%</span>
              </div>
              <div className="metric-item" title="Host RAM Usage">
                <HardDrive size={16} />
                <span>{systemMetrics.mem}%</span>
              </div>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="icon-button"
              title="Settings"
            >
              <Settings size={20} />
            </button>
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
            <p>No services match your filters or settings</p>
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

      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Dashboard Settings</h2>
              <button className="close-button" onClick={() => setIsSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="settings-group">
                <h3>Visibility</h3>
                <label className="setting-item">
                  <span>Show Docker Containers</span>
                  <input 
                    type="checkbox" 
                    checked={settings.showDocker} 
                    onChange={e => setSettings({...settings, showDocker: e.target.checked})}
                  />
                </label>
                <label className="setting-item">
                  <span>Show Databases</span>
                  <input 
                    type="checkbox" 
                    checked={settings.showDatabases} 
                    onChange={e => setSettings({...settings, showDatabases: e.target.checked})}
                  />
                </label>
                <label className="setting-item">
                  <span>Show AI Models</span>
                  <input 
                    type="checkbox" 
                    checked={settings.showAIModels} 
                    onChange={e => setSettings({...settings, showAIModels: e.target.checked})}
                  />
                </label>
                <label className="setting-item">
                  <span>Show Git Projects</span>
                  <input 
                    type="checkbox" 
                    checked={settings.showProjects} 
                    onChange={e => setSettings({...settings, showProjects: e.target.checked})}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

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
