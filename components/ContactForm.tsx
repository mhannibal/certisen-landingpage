'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ContactFormProps {
  labels: {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    send: string;
    sending: string;
    success: string;
    error: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    subjectPlaceholder: string;
    messagePlaceholder: string;
  };
}

export default function ContactForm({ labels }: ContactFormProps) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus('error');
        setErrorMsg(data.error ?? labels.error);
      }
    } catch {
      setStatus('error');
      setErrorMsg(labels.error);
    }
  };

  if (status === 'success') {
    return (
      <Card className="border-2 border-green-500/40 bg-primary-foreground/10 backdrop-blur max-w-lg mx-auto">
        <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
          <CheckCircle className="w-14 h-14 text-green-400" />
          <p className="text-lg font-semibold text-primary-foreground">{labels.success}</p>
          <Button
            variant="outline"
            className="mt-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setStatus('idle')}
          >
            ← {labels.send}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const inputClass =
    'w-full rounded-md border border-primary-foreground/20 bg-primary-foreground/5 px-4 py-2.5 text-primary-foreground placeholder:text-primary-foreground/40 outline-none focus:border-primary-foreground/60 focus:ring-1 focus:ring-primary-foreground/40 transition-colors';

  return (
    <Card className="border-2 border-primary-foreground/20 bg-primary-foreground/10 backdrop-blur max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl md:text-3xl text-primary-foreground">{labels.title}</CardTitle>
        <CardDescription className="text-primary-foreground/70">{labels.subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-primary-foreground/80">{labels.name}</label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder={labels.namePlaceholder}
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-primary-foreground/80">{labels.email}</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder={labels.emailPlaceholder}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary-foreground/80">{labels.subject}</label>
            <input
              name="subject"
              type="text"
              value={form.subject}
              onChange={handleChange}
              placeholder={labels.subjectPlaceholder}
              required
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary-foreground/80">{labels.message}</label>
            <textarea
              name="message"
              rows={5}
              value={form.message}
              onChange={handleChange}
              placeholder={labels.messagePlaceholder}
              required
              className={`${inputClass} resize-none`}
            />
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-md px-4 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg || labels.error}</span>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full gap-2"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {labels.sending}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {labels.send}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
