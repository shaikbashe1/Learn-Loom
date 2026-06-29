import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  GraduationCap, 
  Search, 
  Download, 
  Share2, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Loader2,
  Calendar,
  Lock,
  Trophy,
  Activity,
  Award as AwardIcon
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import type { DBCertificate as Certificate } from '@/types/types';

interface VerifyResult { valid: boolean; course?: string; issued?: string; score?: number }

function generateCertificatePDF(cert: Certificate, userName: string) {
  const courseTitle = cert.courses?.title ?? 'Course';
  const date = new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#eff4ff;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#004ac6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#632ecd;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="800" height="560" fill="url(#bg)" rx="12"/>
  <rect x="20" y="20" width="760" height="520" fill="none" stroke="url(#accent)" stroke-width="2" rx="8"/>
  <rect x="0" y="0" width="800" height="6" fill="url(#accent)"/>
  <text x="400" y="80" font-family="Hanken Grotesk, Georgia" font-size="28" font-weight="bold" fill="url(#accent)" text-anchor="middle">LearnLoom</text>
  <text x="400" y="108" font-family="Inter, Arial" font-size="12" fill="#64748b" text-anchor="middle" letter-spacing="4">CERTIFICATE OF COMPLETION</text>
  <rect x="150" y="122" width="500" height="1" fill="#cbd5e1"/>
  <text x="400" y="160" font-family="Inter, Arial" font-size="13" fill="#64748b" text-anchor="middle">This certifies that</text>
  <text x="400" y="205" font-family="Hanken Grotesk, Georgia" font-size="32" font-weight="bold" fill="#0f172a" text-anchor="middle">${userName}</text>
  <text x="400" y="240" font-family="Inter, Arial" font-size="13" fill="#64748b" text-anchor="middle">has successfully completed</text>
  <text x="400" y="285" font-family="Hanken Grotesk, Georgia" font-size="22" font-weight="bold" fill="url(#accent)" text-anchor="middle">${courseTitle}</text>
  <text x="250" y="340" font-family="Inter, Arial" font-size="11" fill="#64748b" text-anchor="middle">ISSUED ON</text>
  <text x="250" y="360" font-family="Inter, Arial" font-size="14" font-weight="bold" fill="#0f172a" text-anchor="middle">${date}</text>
  <text x="400" y="340" font-family="Inter, Arial" font-size="11" fill="#64748b" text-anchor="middle">SCORE</text>
  <text x="400" y="360" font-family="Inter, Arial" font-size="14" font-weight="bold" fill="#004ac6" text-anchor="middle">${cert.score}%</text>
  <text x="550" y="340" font-family="Inter, Arial" font-size="11" fill="#64748b" text-anchor="middle">CERTIFICATE ID</text>
  <text x="550" y="360" font-family="JetBrains Mono, monospace" font-size="11" fill="#0f172a" text-anchor="middle">${cert.verification_code}</text>
  <rect x="150" y="395" width="500" height="1" fill="#cbd5e1"/>
  <text x="400" y="430" font-family="Inter, Arial" font-size="11" fill="#64748b" text-anchor="middle">This certificate can be verified at learnloom.app/verify/${cert.verification_code}</text>
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
  const featuredCert = certs.length > 0 ? certs[0] : null;
  const remainingCerts = certs.length > 1 ? certs.slice(1) : [];

  return (
    <AppLayout title="Certificates & Achievements">
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col lg:flex-row gap-6 w-full select-none">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-60 shrink-0">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
              Achievements
            </h3>
            <nav className="flex flex-col gap-1.5">
              <a className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold" href="#">
                <Award className="h-4 w-4" />
                <span>Certificates</span>
              </a>
              <a className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all text-xs font-semibold" href="#">
                <Trophy className="h-4 w-4" />
                <span>Badges</span>
              </a>
              <a className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all text-xs font-semibold" href="#">
                <Flag className="h-4 w-4" />
                <span>Skill Milestones</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col gap-6 max-w-[800px] w-full">
          
          {/* QR Dialog */}
          <Dialog open={!!qrCert} onOpenChange={open => !open && setQrCert(null)}>
            <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-sm text-center rounded-3xl shadow-2xl p-8">
              <DialogHeader>
                <DialogTitle className="text-foreground text-base font-bold mb-2">Certificate QR Code</DialogTitle>
              </DialogHeader>
              {qrCert && (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="p-4 bg-white rounded-2xl shadow-inner border border-border">
                    <QRCodeDataUrl
                      text={`${window.location.origin}/verify/${qrCert.verification_code}`}
                      width={180}
                    />
                  </div>
                  <p className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-3.5 py-1.5 rounded-xl border border-border">
                    {qrCert.verification_code}
                  </p>
                  <p className="text-xs text-muted-foreground">Scan to verify this certificate on LearnLoom</p>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-[380px] w-full bg-muted rounded-3xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-[220px] bg-muted rounded-3xl" />
                <Skeleton className="h-[220px] bg-muted rounded-3xl" />
              </div>
            </div>
          ) : certs.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-card/50">
              <Award className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-foreground mb-1">No Certificates Yet</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Complete a course and pass the Grand Test to earn your verified certificate.
              </p>
            </div>
          ) : (
            <>
              {/* Hero: Featured Certificate */}
              {featuredCert && (
                <section className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-chart-4" />
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-wider mb-3 shadow-sm">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Featured
                      </span>
                      <h1 className="font-display text-2xl font-extrabold text-foreground leading-snug">
                        {featuredCert.courses?.title}
                      </h1>
                      <p className="text-xs text-muted-foreground mt-1 font-semibold">Mastery Level Certification</p>
                    </div>
                  </div>
                  
                  {/* Certificate Preview (SVG Rendered) */}
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-6 border border-border bg-muted/30 shadow-inner flex items-center justify-center p-3 md:p-6">
                     <div className="w-full h-full bg-background rounded-xl shadow-sm border border-border flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-background to-background" />
                        <GraduationCap className="w-10 h-10 text-primary mb-3 relative z-10" />
                        <h2 className="text-base sm:text-xl font-bold text-foreground relative z-10 px-4 leading-snug">
                          {featuredCert.courses?.title}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-2 relative z-10">
                          Awarded to <span className="font-bold text-foreground">{userName}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1.5 relative z-10 font-semibold">
                          Score: <span className="text-primary font-bold">{featuredCert.score}%</span> • Issued: {new Date(featuredCert.issued_at).toLocaleDateString()}
                        </p>
                        
                        <div className="absolute bottom-4 left-0 w-full flex justify-center">
                          <div className="flex items-center gap-1.5 text-primary font-bold text-[10px] bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10 mx-auto">
                            <Lock className="h-3 w-3" />
                            <span>ID: {featuredCert.verification_code}</span>
                          </div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                    <Button 
                      onClick={() => generateCertificatePDF(featuredCert, userName)} 
                      className="flex-grow min-h-[44px] h-12 bg-primary text-primary-foreground hover:brightness-110 font-bold rounded-xl shadow-md shadow-primary/10 flex justify-center items-center gap-2 text-xs"
                    >
                      <Download className="h-4 w-4" /> Download PDF
                    </Button>
                    <Button 
                      onClick={() => handleShare(featuredCert)} 
                      variant="outline" 
                      className="flex-grow min-h-[44px] h-12 border-border text-foreground hover:bg-muted/50 font-bold rounded-xl shadow-sm flex justify-center items-center gap-2 text-xs"
                    >
                      <Share2 className="h-4 w-4" /> Share
                    </Button>
                    <Button 
                      onClick={() => setQrCert(featuredCert)} 
                      variant="outline" 
                      className="flex-grow min-h-[44px] h-12 border-border text-foreground hover:bg-muted/50 font-bold rounded-xl shadow-sm flex justify-center items-center gap-2 text-xs"
                    >
                      <QrCode className="h-4 w-4" /> QR Code
                    </Button>
                  </div>
                </section>
              )}

              {/* Grid Gallery */}
              {remainingCerts.length > 0 && (
                <section>
                  <h2 className="font-display text-lg font-bold text-foreground mb-4">Earned Credentials</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {remainingCerts.map(cert => (
                      <div key={cert.id} className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col hover:border-border/80 transition-all">
                        <div className="w-full h-32 rounded-xl bg-muted/40 mb-4 overflow-hidden relative border border-border flex items-center justify-center">
                           <GraduationCap className="w-8 h-8 text-muted-foreground/50" />
                           <div className="absolute top-2.5 right-2.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg text-emerald-500 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                             <CheckCircle2 className="h-3 w-3" /> Verified
                           </div>
                        </div>
                        <h3 className="text-sm font-bold text-foreground mb-1.5 line-clamp-2 leading-snug">
                          {cert.courses?.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4 flex-grow flex items-center gap-1 font-semibold">
                          Score: <span className="font-bold text-primary">{cert.score}%</span> • {new Date(cert.issued_at).toLocaleDateString()}
                        </p>
                        <div className="flex justify-between items-center mt-auto border-t border-border pt-4">
                          <button 
                            onClick={() => setQrCert(cert)} 
                            className="text-muted-foreground hover:text-primary text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[40px] px-1"
                          >
                            <QrCode className="h-4 w-4" /> QR Code
                          </button>
                          <div className="flex gap-2">
                             <button 
                               onClick={() => handleShare(cert)} 
                               className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                               title="Share Certificate"
                             >
                               <Share2 className="h-4 w-4" />
                             </button>
                             <button 
                               onClick={() => generateCertificatePDF(cert, userName)} 
                               className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                               title="Download PDF"
                             >
                               <Download className="h-4 w-4" />
                             </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Certificate Verification Section */}
          <section className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden mt-4">
             <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-primary/5 rounded-full blur-3xl opacity-20 pointer-events-none" />
             
             <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
               <CheckCircle2 className="h-5 w-5 text-primary" /> Verify Certificate
             </h3>
             
             <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
               Enter a certificate ID below to verify its authenticity on the LearnLoom network.
             </p>
             
             <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3 relative z-10">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <Input
                    placeholder="e.g. LL-2026-CERT-XXXXXXXX"
                    className="pl-11 bg-background border-border text-xs h-11 rounded-xl focus:ring-primary/20 focus:border-primary shadow-inner font-medium placeholder:text-muted-foreground/60"
                    value={verifyId}
                    onChange={e => { setVerifyId(e.target.value); setVerifyResult(null); }}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={verifying} 
                  className="h-11 px-8 bg-primary text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/10 text-xs"
                >
                  {verifying ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Verify'}
                </Button>
             </form>

             {verifyResult?.valid && (
                <div className="mt-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-500 mb-1">Certificate is Valid</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-bold text-foreground block mb-1">{verifyResult.course}</span>
                      {verifyResult.issued && `Issued: ${new Date(verifyResult.issued).toLocaleDateString()}`}
                      {verifyResult.score !== undefined && ` • Score: ${verifyResult.score}%`}
                    </p>
                  </div>
                </div>
              )}
              
              {verifyResult && !verifyResult.valid && (
                <div className="mt-6 p-4 rounded-2xl bg-destructive/5 border border-destructive/10 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <XCircle className="w-5 h-5 text-destructive shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-destructive mb-1">Certificate Not Found</p>
                    <p className="text-xs text-muted-foreground">No valid certificate found with this code. Please check and try again.</p>
                  </div>
                </div>
              )}
          </section>

        </main>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
          
          {/* Skill Radar */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="text-xs font-bold text-foreground mb-4 border-b border-border pb-3">Skill Focus</h3>
            <div className="w-full aspect-square rounded-full border border-border relative flex items-center justify-center bg-muted/20 overflow-hidden shadow-inner">
              <div className="absolute inset-4 rounded-full border border-border flex items-center justify-center">
                <div className="absolute inset-4 rounded-full border border-border flex items-center justify-center">
                  <div className="absolute inset-4 rounded-full border border-border bg-card/60">
                    <svg className="w-full h-full opacity-70" viewBox="0 0 100 100">
                      <polygon fill="url(#grad1)" points="50,10 90,40 70,90 30,90 10,40" stroke="#004ac6" strokeWidth="1" />
                      <defs>
                        <linearGradient id="grad1" x1="0%" x2="100%" y1="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#57dffe', stopOpacity: 0.6 }} />
                          <stop offset="100%" style={{ stopColor: '#632ecd', stopOpacity: 0.6 }} />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5 justify-center">
              <span className="px-2 py-0.5 rounded-lg bg-background border border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Frontend</span>
              <span className="px-2 py-0.5 rounded-lg bg-background border border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">AI/ML</span>
              <span className="px-2 py-0.5 rounded-lg bg-background border border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Backend</span>
            </div>
          </div>

          {/* Achievement Timeline */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="text-xs font-bold text-foreground mb-4 border-b border-border pb-3">Timeline</h3>
            <div className="relative pl-4 border-l border-border flex flex-col gap-6 ml-2">
              <div className="relative">
                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card" />
                <p className="text-xs font-bold text-foreground">First Certificate</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Earned your first cert.</p>
                <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-1">Recent</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-card" />
                <p className="text-xs font-bold text-foreground">7-Day Streak</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Consistent learning.</p>
                <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-1">Last Week</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-chart-4 ring-4 ring-card" />
                <p className="text-xs font-bold text-foreground">Joined LearnLoom</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Started the journey.</p>
                <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-1">Last Month</p>
              </div>
            </div>
          </div>
          
        </aside>

      </div>
    </AppLayout>
  );
}
