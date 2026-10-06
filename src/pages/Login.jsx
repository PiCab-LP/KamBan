import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import ThemeToggle from '../components/ThemeToggle';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.success) {
      // El índice redirige a cada rol a su pantalla de inicio.
      navigate('/', { replace: true });
    } else {
      setError('Correo o contraseña incorrectos.');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 font-sans">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] -z-10" />

      <ThemeToggle className="absolute right-4 top-4" />

      <div className="w-full max-w-sm animate-kanban-scale-in">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
                <ShieldCheck size={18} strokeWidth={2.5} className="text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">QANBAN</span>
            </div>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-medium text-foreground">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@trez.pe"
                    className="pl-8"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-xs font-medium text-foreground">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-8"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs font-bold text-destructive text-center -mt-1">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {submitting ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
