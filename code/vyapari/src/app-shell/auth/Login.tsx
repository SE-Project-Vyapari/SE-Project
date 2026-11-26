import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import logoMonogram from '../../assets/logo-monogram.svg';

const FlowDiagram = () => (
  <svg viewBox="-40 20 480 360" width="100%" style={{ maxWidth: 420, height: 'auto' }} role="img" aria-label="Inventory, Sales, Finance and Insights connected through Vyapari">
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
    <div className="vy-auth">
      
      <div className="vy-auth__hero">
        <h2 style={{ marginBottom: 'var(--spacing-12)', color: 'var(--color-primary)', fontSize: 28, textAlign: 'center' }}>One business. One system.</h2>
        <p style={{ color: 'var(--color-muted-text)', marginBottom: 'var(--spacing-32)', textAlign: 'center' }}>Connect your inventory, sales, and finance effortlessly.</p>
        <FlowDiagram />
      </div>

      <div className="vy-auth__form">
        <Card style={{ width: '100%', maxWidth: 400, padding: 'var(--spacing-32)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-32)' }}>
            <img src={logoMonogram} alt="Vyapari" width={48} style={{ marginBottom: 'var(--spacing-16)' }} />
            <h3 style={{ fontSize: 22, marginBottom: 4 }}>Welcome to Vyapari</h3>
            <p style={{ color: 'var(--color-muted-text)' }}>Sign in to your business</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
            <div>
              <label htmlFor="login-email" className="vy-field-label">Email Address</label>
              <Input 
                id="login-email"
                type="email" 
                placeholder="admin@vyapari.com"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label htmlFor="login-password" className="vy-field-label" style={{ marginBottom: 0 }}>Password</label>
                <a href="#" onClick={handleForgot} style={{ fontSize: 'var(--font-size-12)' }}>Forgot Password?</a>
              </div>
              <Input 
                id="login-password"
                type="password" 
                placeholder="••••••••"
                required
                style={{ width: '100%' }}
              />
            </div>
            
            {showForgotMsg && (
              <p style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-12)' }}>
                Please check your email for reset instructions.
              </p>
            )}

            <Button type="submit" variant="primary" block style={{ marginTop: 'var(--spacing-8)', minHeight: 44 }}>
              Sign In
            </Button>
          </form>

          <div style={{ margin: 'var(--spacing-24) 0', textAlign: 'center', borderBottom: '1px solid var(--color-border)', lineHeight: '0.1em' }}>
            <span style={{ background: 'var(--color-surface)', padding: '0 var(--spacing-8)', color: 'var(--color-muted-text)', fontSize: 'var(--font-size-12)' }}>OR</span>
          </div>

          <Button onClick={handleDemoLogin} variant="soft" block style={{ minHeight: 44 }}>
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
