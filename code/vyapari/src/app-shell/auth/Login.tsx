import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import logoMonogram from '../../assets/logo-monogram.svg';

const FlowDiagram = () => (
  <svg viewBox="0 0 400 400" width="100%" height="100%" style={{ maxWidth: 400 }}>
    <g fill="none" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="4 4">
      <circle cx="200" cy="200" r="120" />
    </g>
    <g fill="var(--color-primary)">
      <circle cx="200" cy="80" r="16" />
      <text x="200" y="55" textAnchor="middle" fill="var(--color-dark)" fontSize="14" fontWeight="600">Inventory</text>
      
      <circle cx="320" cy="200" r="16" />
      <text x="350" y="205" textAnchor="start" fill="var(--color-dark)" fontSize="14" fontWeight="600">Sales</text>
      
      <circle cx="200" cy="320" r="16" />
      <text x="200" y="350" textAnchor="middle" fill="var(--color-dark)" fontSize="14" fontWeight="600">Finance</text>
      
      <circle cx="80" cy="200" r="16" />
      <text x="50" y="205" textAnchor="end" fill="var(--color-dark)" fontSize="14" fontWeight="600">Insights</text>
    </g>
    <circle cx="200" cy="200" r="40" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="4" />
    <text x="200" y="205" textAnchor="middle" fill="var(--color-primary)" fontSize="16" fontWeight="bold">Vyapari</text>
  </svg>
);

export const Login = () => {
  const { loginAsDemo, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [showForgotMsg, setShowForgotMsg] = useState(false);

  const handleDemoLogin = () => {
    loginAsDemo();
    navigate('/');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email);
    navigate('/');
  };

  const handleForgot = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowForgotMsg(true);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-48)', borderRight: '1px solid var(--color-border)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-16)', color: 'var(--color-primary)' }}>One business. One system.</h2>
        <p style={{ color: 'var(--color-muted-text)', marginBottom: 'var(--spacing-48)' }}>Connect your inventory, sales, and finance effortlessly.</p>
        <FlowDiagram />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-48)' }}>
        <Card style={{ width: '100%', maxWidth: 400, padding: 'var(--spacing-32)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-32)' }}>
            <img src={logoMonogram} alt="Vyapari" width={48} style={{ marginBottom: 'var(--spacing-16)' }} />
            <h3>Welcome to Vyapari</h3>
            <p style={{ color: 'var(--color-muted-text)' }}>Sign in to your business</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-14)', fontWeight: 500 }}>Email Address</label>
              <Input 
                type="email" 
                placeholder="owner@example.com"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: 'var(--spacing-8) var(--spacing-12)' }}
              />
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-4)' }}>
                <label style={{ fontSize: 'var(--font-size-14)', fontWeight: 500 }}>Password</label>
                <a href="#" onClick={handleForgot} style={{ fontSize: 'var(--font-size-12)' }}>Forgot Password?</a>
              </div>
              <Input 
                type="password" 
                placeholder="••••••••"
                required
                style={{ width: '100%', padding: 'var(--spacing-8) var(--spacing-12)' }}
              />
            </div>
            
            {showForgotMsg && (
              <p style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-12)' }}>
                Please check your email for reset instructions.
              </p>
            )}

            <Button type="submit" style={{ width: '100%', padding: 'var(--spacing-12)', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginTop: 'var(--spacing-8)' }}>
              Sign In
            </Button>
          </form>

          <div style={{ margin: 'var(--spacing-24) 0', textAlign: 'center', borderBottom: '1px solid var(--color-border)', lineHeight: '0.1em' }}>
            <span style={{ background: 'var(--color-surface)', padding: '0 var(--spacing-8)', color: 'var(--color-muted-text)', fontSize: 'var(--font-size-12)' }}>OR</span>
          </div>

          <Button onClick={handleDemoLogin} style={{ width: '100%', padding: 'var(--spacing-12)', backgroundColor: 'var(--color-secondary)', color: 'var(--color-dark)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
            Continue with demo account
          </Button>

          <p style={{ textAlign: 'center', marginTop: 'var(--spacing-24)', fontSize: 'var(--font-size-14)' }}>
            New to Vyapari? <a href="/onboarding" style={{ fontWeight: 600 }}>Set up your business</a>
          </p>
        </Card>
      </div>
    </div>
  );
};
