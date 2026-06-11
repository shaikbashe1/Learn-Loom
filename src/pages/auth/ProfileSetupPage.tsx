import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Zap, Camera, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const domains = ['Data Science', 'Web Development', 'AI/ML', 'Cybersecurity', 'DSA', 'Mobile Dev', 'Cloud Computing', 'DevOps'];

export default function ProfileSetupPage() {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const toggleDomain = (d: string) => {
    setSelectedDomains(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: name.trim() || null,
        bio: bio.trim() || null,
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to save profile', { description: error.message });
      setSaving(false);
      return;
    }

    await refreshProfile();
    toast.success('Profile setup complete!');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 hero-gradient">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-chart-2/10 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="flex items-center gap-2 justify-center mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold gradient-text">LearnLoom</span>
          </div>
          <p className="text-muted-foreground text-sm">Let's set up your learning profile</p>
        </div>

        <Card className="bg-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Complete Your Profile</CardTitle>
            <div className="flex gap-2 mt-2">
              {['Account', 'Verification', 'Profile'].map((step, i) => (
                <div key={step} className="flex items-center gap-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 2 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary border border-primary/40'}`}>
                    {i < 2 ? <CheckCircle className="w-3 h-3" /> : 3}
                  </div>
                  <span className={`text-xs ${i === 2 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{step}</span>
                  {i < 2 && <span className="text-muted-foreground mx-1">›</span>}
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                      {name ? name.slice(0, 2).toUpperCase() : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <button type="button" className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Camera className="w-3 h-3 text-primary-foreground" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Profile Photo</p>
                  <p className="text-xs text-muted-foreground">We'll use your initials for now</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-normal text-foreground">Display Name</Label>
                <Input
                  placeholder="Your full name"
                  className="bg-input border-border text-foreground"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-normal text-foreground">Bio (Optional)</Label>
                <Textarea
                  placeholder="Tell us about yourself and your learning goals..."
                  className="bg-input border-border text-foreground resize-none"
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-normal text-foreground">Learning Interests (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {domains.map(d => (
                    <Badge
                      key={d}
                      onClick={() => toggleDomain(d)}
                      className={`cursor-pointer transition-all ${selectedDomains.includes(d) ? 'bg-primary/20 text-primary border-primary/50' : 'bg-muted text-muted-foreground border-border hover:border-primary/40'}`}
                      variant="outline"
                    >
                      {selectedDomains.includes(d) && <CheckCircle className="w-3 h-3 mr-1" />}
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 glow-cyan"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Complete Setup & Start Learning
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
