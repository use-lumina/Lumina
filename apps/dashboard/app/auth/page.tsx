'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Sparkles, TrendingUp, Zap } from 'lucide-react';

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

  // Clear error when user starts typing
  useEffect(() => {
    if (error) setError(null);
  }, [email, password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || `Login failed: ${res.status}`);
        setLoading(false);
        return;
      }

      // Server sets httpOnly cookie; redirect to original path or homepage
      const _data = await res.json().catch(() => ({}));
      const from = searchParams.get('from') || '/';
      router.push(from);
    } catch (err) {
      setError((err as Error).message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.2] bg-size-[20px_20px]" />
        </div>

        <div className="relative z-10 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Lumina</h1>
          </div>
          <p className="text-blue-100 text-lg">Observe and optimize AI in production</p>
        </div>

        <div className="relative z-10 space-y-6 animate-fade-in stagger-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-white/20 p-3">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Real-time Monitoring</h3>
                <p className="text-blue-100 text-sm">
                  Track your AI models in production with live traces and performance metrics.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-white/20 p-3">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Cost Optimization</h3>
                <p className="text-blue-100 text-sm">
                  Monitor costs, detect spikes, and optimize your AI spending effortlessly.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-blue-100 text-sm animate-fade-in stagger-4">
          © 2025 Lumina. All rights reserved.
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-scale-in">
          <div className="lg:hidden mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Lumina</h1>
            </div>
            <p className="text-muted-foreground">Observe and optimize AI in production</p>
          </div>

          <Card className="p-8 border-(--border) shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to access your Lumina dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 font-medium"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-(--border)">
              <p className="text-xs text-center text-muted-foreground">
                Need help? Contact{' '}
                <a
                  href="mailto:support@lumina.dev"
                  className="text-primary hover:underline font-medium"
                >
                  support@lumina.dev
                </a>
              </p>
            </div>
          </Card>

          <p className="text-xs text-center text-muted-foreground mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}
    >
      <AuthForm />
    </Suspense>
  );
}
