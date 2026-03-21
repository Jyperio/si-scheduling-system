import { useState, useEffect } from 'react';
import StudentView from './components/StudentView';
import SIDashboard from './components/SIDashboard';
import AuthForm from './components/AuthForm';

function App() {
  const [token, setToken] = useState(sessionStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem('user')) || null);

  const handleAuthSuccess = (newToken, newUser) => {
    sessionStorage.setItem('token', newToken);
    sessionStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return (
      <div className="app-container" style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ justifyContent: 'center', borderBottom: 'none', background: 'transparent', boxShadow: 'none', paddingTop: '3rem' }}>
           <h1 style={{ fontSize: '2rem', color: 'var(--primary-color)', fontWeight: 800 }}>SI Platform</h1>
        </header>
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <h1>SI Platform</h1>
          <p>Logged in as {user.name} ({user.role === 'si' ? 'Instructor' : 'Student'})</p>
        </div>
        <div className="nav-tabs" style={{ width: 'auto' }}>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.6rem 1.25rem' }}>
            Logout
          </button>
        </div>
      </header>

      <main>
        {user.role === 'student' ? <StudentView /> : <SIDashboard />}
      </main>
      
      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <p>&copy; {new Date().getFullYear()} SI Session Booking System. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
