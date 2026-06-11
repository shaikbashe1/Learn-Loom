import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraduationCap, Search, Download, Share2, QrCode, CheckCircle, XCircle, Award, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';

interface Certificate {
  id: string;
  course_id: string;
  score: number;
  verification_code: string;
  issued_at: string;
  is_valid: boolean;
  courses?: { title: string; instructor_name: string; instructor: string };
}

interface VerifyResult { valid: boolean; course?: string; issued?: string; score?: number }

function generateCertificatePDF(cert: Certificate, userName: string) {
  const courseTitle = cert.courses?.title ?? 'Course';
  const date = new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Build SVG certificate content and trigger print/download
  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0f1e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d1627;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00e5ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="800" height="560" fill="url(#bg)" rx="12"/>
  <rect x="20" y="20" width="760" height="520" fill="none" stroke="url(#accent)" stroke-width="2" rx="8"/>
  <rect x="0" y="0" width="800" height="6" fill="url(#accent)"/>
  <!-- Logo text -->
  <text x="400" y="80" font-family="Georgia" font-size="28" font-weight="bold" fill="url(#accent)" text-anchor="middle">LearnLoom</text>
  <text x="400" y="108" font-family="Arial" font-size="12" fill="#64748b" text-anchor="middle" letter-spacing="4">CERTIFICATE OF COMPLETION</text>
  <!-- Divider -->
  <rect x="150" y="122" width="500" height="1" fill="#1e293b"/>
  <!-- Awarded to -->
  <text x="400" y="160" font-family="Arial" font-size="13" fill="#94a3b8" text-anchor="middle">This certifies that</text>
  <text x="400" y="205" font-family="Georgia" font-size="32" font-weight="bold" fill="#e2e8f0" text-anchor="middle">${userName}</text>
  <text x="400" y="240" font-family="Arial" font-size="13" fill="#94a3b8" text-anchor="middle">has successfully completed</text>
  <text x="400" y="285" font-family="Georgia" font-size="22" font-weight="bold" fill="url(#accent)" text-anchor="middle">${courseTitle}</text>
  <!-- Stats -->
  <text x="250" y="340" font-family="Arial" font-size="11" fill="#64748b" text-anchor="middle">ISSUED ON</text>
  <text x="250" y="360" font-family="Arial" font-size="14" font-weight="bold" fill="#e2e8f0" text-anchor="middle">${date}</text>
  <text x="400" y="340" font-family="Arial" font-size="11" fill="#64748b" text-anchor="middle">SCORE</text>
  <text x="400" y="360" font-family="Arial" font-size="14" font-weight="bold" fill="#00e5ff" text-anchor="middle">${cert.score}%</text>
  <text x="550" y="340" font-family="Arial" font-size="11" fill="#64748b" text-anchor="middle">CERTIFICATE ID</text>
  <text x="550" y="360" font-family="monospace" font-size="11" fill="#e2e8f0" text-anchor="middle">${cert.verification_code}</text>
  <!-- Footer -->
  <rect x="150" y="395" width="500" height="1" fill="#1e293b"/>
  <text x="400" y="430" font-family="Arial" font-size="11" fill="#475569" text-anchor="middle">This certificate can be verified at learnloom.app/verify/${cert.verification_code}</text>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LearnLoom-Certificate-${cert.verification_code}.svg`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Certificate downloaded!');
}

export default function CertificatePage() {
  const { user, profile } = useAuth();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyId, setVerifyId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [qrCert, setQrCert] = useState<Certificate | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('certificates')
        .select('*, courses!certificates_course_id_fkey(title, instructor_name, instructor)')
        .eq('user_id', user.id)
        .eq('is_valid', true)
        .order('issued_at', { ascending: false });
      if (error) { console.error(error); toast.error('Failed to load certificates'); }
      setCerts(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyId.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    const { data } = await supabase
      .from('certificates')
      .select('*, courses!certificates_course_id_fkey(title)')
      .eq('verification_code', verifyId.trim())
      .eq('is_valid', true)
      .maybeSingle();
    setVerifying(false);
    if (data) {
      setVerifyResult({ valid: true, course: data.courses?.title, issued: data.issued_at, score: data.score });
    } else {
      setVerifyResult({ valid: false });
    }
  };

  const handleShare = (cert: Certificate) => {
    const url = `${window.location.origin}/verify/${cert.verification_code}`;
    if (navigator.share) {
      navigator.share({ title: 'My LearnLoom Certificate', text: `I completed ${cert.courses?.title}!`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Certificate link copied to clipboard!');
    }
  };

  const userName = profile?.full_name ?? 'Student';

  return (
    <AppLayout title="Certificates">
      <div className="max-w-5xl mx-auto space-y-8">
        <h2 className="text-2xl font-bold text-foreground text-balance">My Certificates</h2>

        {/* QR Dialog */}
        <Dialog open={!!qrCert} onOpenChange={open => !open && setQrCert(null)}>
          <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-foreground">Certificate QR Code</DialogTitle>
            </DialogHeader>
            {qrCert && (
              <div className="flex flex-col items-center gap-4 py-2">
                <QRCodeDataUrl
                  text={`${window.location.origin}/verify/${qrCert.verification_code}`}
                  width={200}
                />
                <p className="text-xs text-muted-foreground font-mono">{qrCert.verification_code}</p>
                <p className="text-xs text-muted-foreground text-pretty">Scan to verify this certificate on LearnLoom</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Earned Certificates */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="bg-card border-border overflow-hidden">
                <div className="p-8"><Skeleton className="h-40 w-full bg-muted rounded-lg" /></div>
              </Card>
            ))
          ) : certs.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-xl">
              <Award className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-semibold text-foreground mb-2">No Certificates Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto text-pretty">
                Complete a course and pass the Grand Test to earn your certificate
              </p>
            </div>
          ) : (
            certs.map(cert => (
              <Card key={cert.id} className="bg-card border-border overflow-hidden">
                <div className="relative">
                  <div className="bg-gradient-to-br from-background via-card to-background p-6 md:p-8 border-b border-border">
                    <div className="max-w-2xl mx-auto text-center">
                      <div className="flex items-center justify-center gap-2 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold gradient-text">LearnLoom</span>
                      </div>
                      <p className="text-muted-foreground text-sm uppercase tracking-widest mb-2">Certificate of Completion</p>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">{cert.courses?.title}</h3>
                      <p className="text-muted-foreground text-sm mb-4">Awarded to</p>
                      <p className="text-3xl font-bold gradient-text mb-4">{userName}</p>
                      <p className="text-sm text-muted-foreground mb-6">for successfully completing the course and passing the Grand Test</p>
                      <div className="flex items-center justify-center gap-8 text-sm flex-wrap">
                        <div>
                          <p className="text-muted-foreground text-xs">Issued</p>
                          <p className="text-foreground font-medium">
                            {new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-border hidden md:block" />
                        <div>
                          <p className="text-muted-foreground text-xs">Score</p>
                          <p className="text-primary font-bold text-lg">{cert.score}%</p>
                        </div>
                        <div className="w-px h-8 bg-border hidden md:block" />
                        <div>
                          <p className="text-muted-foreground text-xs">ID</p>
                          <p className="text-foreground font-medium font-mono text-xs">{cert.verification_code}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-chart-3" />
                        <span className="text-xs text-muted-foreground">Verified Certificate</span>
                        <Badge className="text-[10px] bg-chart-3/15 text-chart-3 border-chart-3/30">Valid</Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => setQrCert(cert)} className="h-8 text-xs border border-border text-foreground hover:bg-accent">
                          <QrCode className="w-3.5 h-3.5 mr-1" /> QR Code
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleShare(cert)} className="h-8 text-xs border border-border text-foreground hover:bg-accent">
                          <Share2 className="w-3.5 h-3.5 mr-1" /> Share
                        </Button>
                        <Button size="sm" onClick={() => generateCertificatePDF(cert, userName)} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                          <Download className="w-3.5 h-3.5 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Certificate Verification */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" /> Verify a Certificate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter Verification Code (e.g. LL-2026-CERT-XXXXXXXX)"
                  className="pl-10 bg-input border-border text-foreground"
                  value={verifyId}
                  onChange={e => { setVerifyId(e.target.value); setVerifyResult(null); }}
                />
              </div>
              <Button type="submit" disabled={verifying} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
              </Button>
            </form>
            {verifyResult?.valid && (
              <div className="mt-4 p-3 rounded-lg bg-chart-3/10 border border-chart-3/30 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-chart-3 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-chart-3">Certificate is Valid</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">{verifyResult.course}</span>
                    {verifyResult.issued && ` · Issued ${new Date(verifyResult.issued).toLocaleDateString()}`}
                    {verifyResult.score !== undefined && ` · Score: ${verifyResult.score}%`}
                  </p>
                </div>
              </div>
            )}
            {verifyResult && !verifyResult.valid && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Certificate Not Found</p>
                  <p className="text-xs text-muted-foreground">No valid certificate found with this code. Please check and try again.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
