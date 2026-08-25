import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Card } from './components/ui/Card';

const StyleGuide = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Vyapari Style Guide</h1>
      
      <section style={{ marginBottom: '3rem' }}>
        <h2>Tokens & Colors</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          {['var(--color-primary)', 'var(--color-secondary)', 'var(--color-success)', 'var(--color-danger)', 'var(--color-warning)'].map(color => (
            <div key={color} style={{ width: '80px', height: '80px', backgroundColor: color, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Typography</h2>
        <h1 style={{ fontSize: 'var(--spacing-48)' }}>Heading 1</h1>
        <h2 style={{ fontSize: 'var(--spacing-32)' }}>Heading 2</h2>
        <p>Body text in Inter font, showing how the general font styling appears.</p>
        <p className="tabular-nums">1,250.00</p>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Components (Base Implementations)</h2>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <Button>Primary Button</Button>
          <Button style={{ backgroundColor: 'var(--color-secondary)' }}>Secondary Button</Button>
          <Button style={{ backgroundColor: 'var(--color-danger)' }}>Danger Button</Button>
        </div>
        <Card style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          <h3>Sample Card</h3>
          <p>This is a card placeholder.</p>
          <Input placeholder="Sample Input..." style={{ padding: '0.5rem', marginTop: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
        </Card>
      </section>

      <section>
        <h2>Logos</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginTop: '1rem' }}>
          <img src="/src/assets/logo-monogram.svg" alt="Monogram" width="80" />
          <img src="/src/assets/logo-lockup.svg" alt="Lockup" width="200" />
        </div>
      </section>
    </div>
  );
};

export default StyleGuide;
