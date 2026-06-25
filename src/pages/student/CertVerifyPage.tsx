import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle, XCircle, GraduationCap, User, BookOpen,
  Calendar, ShieldCheck, Zap, ArrowLeft,
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-foreground">LearnLoom</span>
        </div>
        <span className="text-muted-foreground text-sm">Certificate Verification</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" />Back to Home
          </Link>

          {loading ? (
            <Card className="border-border">
              <CardContent className="p-8 space-y-4">
                <Skeleton className="h-12 w-12 rounded-full bg-muted mx-auto" />
                <Skeleton className="h-6 w-48 bg-muted mx-auto" />
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 w-full bg-muted" />)}
              </CardContent>
            </Card>
          ) : !result?.found ? (
            <Card className="border-border">
              <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="text-xl font-bold text-foreground text-balance">Certificate Not Found</h1>
                <p className="text-sm text-muted-foreground text-pretty">
                  No certificate found for code <code className="font-mono bg-muted px-1 rounded">{code}</code>.
                  Please double-check the verification code.
                </p>
                <Link to="/">
                  <Button variant="outline" size="sm" className="min-h-[44px]">Back to Home</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border overflow-hidden">
              {/* Status banner */}
              <div className={`px-6 py-4 flex items-center gap-3 ${result.valid ? 'bg-chart-2/10 border-b border-chart-2/20' : 'bg-destructive/10 border-b border-destructive/20'}`}>
                {result.valid
                  ? <CheckCircle className="w-6 h-6 text-chart-2 shrink-0" />
                  : <XCircle className="w-6 h-6 text-destructive shrink-0" />}
                <div>
                  <p className={`font-semibold text-sm ${result.valid ? 'text-chart-2' : 'text-destructive'}`}>
                    {result.valid ? 'Certificate Valid' : result.revoked ? 'Certificate Revoked' : 'Certificate Invalid'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Code: <span className="font-mono">{result.verification_code}</span>
                  </p>
                </div>
                <div className="ml-auto">
                  <Badge className={result.valid ? 'bg-chart-2/15 text-chart-2 border-chart-2/30' : 'bg-destructive/15 text-destructive border-destructive/30'}>
                    {result.valid ? 'Valid' : 'Invalid'}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6 sm:p-8 space-y-5">
                {/* Certificate body */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">This certificate is awarded to</p>
                  <h2 className="text-2xl font-bold text-foreground text-balance">{result.student_name ?? '—'}</h2>
                  <p className="text-sm text-muted-foreground">for successfully completing</p>
                  <h3 className="text-lg font-semibold text-primary text-balance">{result.course_title ?? '—'}</h3>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Student Name</p>
                      <p className="font-medium text-foreground">{result.student_name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Instructor</p>
                      <p className="font-medium text-foreground">{result.instructor_name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Issued On</p>
                      <p className="font-medium text-foreground">{formatDate(result.issued_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Issued By</p>
                      <p className="font-medium text-foreground">LearnLoom</p>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-2 pt-4 border-t border-border">
                  <QRCodeDataUrl text={verifyUrl} width={128} />
                  <p className="text-[11px] text-muted-foreground">Scan QR code to verify again</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
