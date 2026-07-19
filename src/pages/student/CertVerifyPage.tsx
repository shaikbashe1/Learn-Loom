import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2, 
  XCircle, 
  GraduationCap, 
  User, 
  BookOpen,
  Calendar, 
  ShieldCheck, 
  Zap, 
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';

interface VerifyResult {
  found: boolean;
  valid: boolean;
  student_name: string | null;
  course_title: string | null;
  instructor_name: string | null;
  issued_at: string | null;
  verification_code: string;
  revoked: boolean;
}

export default function CertVerifyPage() {
  const { code } = useParams<{ code: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  const verifyUrl = `${window.location.origin}/verify/${code ?? ''}`;

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    const lookup = async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          user_id, verification_code, is_valid, revoked, issued_at,
          courses!certificates_course_id_fkey(title, instructor_name, instructor)
        `)
        .eq('verification_code', code)
        .maybeSingle();

      if (error || !data) {
        setResult({
          found: false, valid: false, revoked: false,
          student_name: null, course_title: null, instructor_name: null,
          issued_at: null, verification_code: code,
        });
        setLoading(false);
        return;
      }

      const d = data as {
        user_id: string;
        verification_code: string;
        is_valid: boolean;
        revoked: boolean;
        issued_at: string;
        courses: unknown;
      };

      const { data: profileDataResponse } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', d.user_id)
        .maybeSingle();

      const profileData = profileDataResponse as { full_name: string | null } | null;

      const courseData = Array.isArray(d.courses)
        ? (d.courses[0] as { title: string; instructor_name: string; instructor: string } | undefined)
        : (d.courses as { title: string; instructor_name: string; instructor: string } | null);

      setResult({
        found: true,
        valid: d.is_valid && !d.revoked,
        revoked: d.revoked,
        student_name: profileData?.full_name ?? null,
        course_title: courseData?.title ?? null,
        instructor_name: courseData?.instructor_name || courseData?.instructor || null,
        issued_at: d.issued_at,
        verification_code: d.verification_code,
      });
      setLoading(false);
    };
    void lookup();
  }, [code]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col select-none relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-chart-4/5 blur-[120px] pointer-events-none z-0" />

      {/* Minimal header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
            <img src="/images/logo/logo-icon-light.png" alt="Quovexi Logo" className="w-4 h-4 object-contain" />
          </div>
          <span className="font-display text-sm font-bold text-foreground">Quovexi</span>
        </div>
        <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
          Certificate Verification
        </span>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md space-y-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>

          {loading ? (
            <Card className="border-border bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl">
              <CardContent className="p-8 space-y-6">
                <Skeleton className="h-12 w-12 rounded-2xl bg-muted mx-auto" />
                <Skeleton className="h-6 w-48 bg-muted mx-auto rounded-xl" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full bg-muted rounded-lg" />
                  <Skeleton className="h-4 w-full bg-muted rounded-lg" />
                  <Skeleton className="h-4 w-3/4 bg-muted rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ) : !result?.found ? (
            <Card className="border-border bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl">
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                  <XCircle className="w-8 h-8" />
                </div>
                <h1 className="text-lg font-bold text-foreground">Certificate Not Found</h1>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  No certificate found for code <code className="font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border text-foreground">{code}</code>. Please double-check the verification code.
                </p>
                <Link to="/">
                  <Button variant="outline" className="min-h-[40px] rounded-xl text-xs font-bold border-border">
                    Back to Home
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
              {/* Status banner */}
              <div className={`px-6 py-4 flex items-center gap-3 border-b ${
                result.valid 
                  ? 'bg-emerald-500/5 border-emerald-500/10' 
                  : 'bg-destructive/5 border-destructive/10'
              }`}>
                {result.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`font-bold text-xs ${result.valid ? 'text-emerald-500' : 'text-destructive'}`}>
                    {result.valid ? 'Certificate Valid' : result.revoked ? 'Certificate Revoked' : 'Certificate Invalid'}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                    Code: <span className="font-mono text-foreground">{result.verification_code}</span>
                  </p>
                </div>
              </div>

              <CardContent className="p-8 space-y-6">
                {/* Certificate body */}
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">
                    This certificate is awarded to
                  </p>
                  <h2 className="text-xl font-extrabold text-foreground leading-snug">{result.student_name ?? '—'}</h2>
                  <p className="text-xs text-muted-foreground">for successfully completing</p>
                  <h3 className="text-sm font-bold text-primary leading-normal px-2">{result.course_title ?? '—'}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs border-t border-border pt-6">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Student Name</p>
                      <p className="font-bold text-foreground mt-0.5">{result.student_name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Instructor</p>
                      <p className="font-bold text-foreground mt-0.5">{result.instructor_name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 mt-2">
                    <Calendar className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Issued On</p>
                      <p className="font-bold text-foreground mt-0.5">{formatDate(result.issued_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 mt-2">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Issued By</p>
                      <p className="font-bold text-foreground mt-0.5">Quovexi</p>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-2 pt-6 border-t border-border">
                  <div className="p-3 bg-white rounded-xl border border-border">
                    <QRCodeDataUrl text={verifyUrl} width={100} />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">Scan QR code to verify again</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
