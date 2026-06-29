import type { ReactNode } from 'react';
import { 
  GraduationCap, 
  Briefcase, 
  Building2, 
  Phone, 
  Globe, 
  User, 
  AtSign, 
  Rocket, 
  Building, 
  Code, 
  Flag, 
  Clock, 
  Brain, 
  Star, 
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  school: GraduationCap,
  work: Briefcase,
  account_balance: Building2,
  call: Phone,
  public: Globe,
  person: User,
  alternate_email: AtSign,
  rocket_launch: Rocket,
  apartment: Building,
  code: Code,
  flag: Flag,
  schedule: Clock,
  psychology: Brain,
  work_outline: Briefcase,
  star: Star,
  check_circle: CheckCircle2,
};

function getIcon(name?: string) {
  if (!name) return null;
  return iconMap[name] || HelpCircle;
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="block text-xs font-bold text-foreground mb-2">
      {children}
      {hint && <span className="ml-2 text-muted-foreground font-normal text-[11px]">{hint}</span>}
    </label>
  );
}

export function TextField({
  value, onChange, placeholder, type = 'text', icon, maxLength, inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: string;
  maxLength?: number;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
}) {
  const IconComponent = getIcon(icon);

  return (
    <div className="relative">
      {IconComponent && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
          <IconComponent className="h-4 w-4" />
        </div>
      )}
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none rounded-xl py-3 ${
          IconComponent ? 'pl-11' : 'pl-4'
        } pr-4 text-sm placeholder:text-muted-foreground/60 transition-all duration-200 min-h-[44px]`}
      />
    </div>
  );
}

/** A selectable pill. Works for both single- and multi-select grids. */
export function Chip({
  label, selected, onClick, icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: string;
}) {
  const IconComponent = getIcon(icon);
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
        selected
          ? 'bg-primary/10 text-primary border-primary/30 shadow-sm shadow-primary/5'
          : 'bg-background text-muted-foreground border-border hover:border-border/80 hover:text-foreground'
      }`}
    >
      {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
      {selected && !IconComponent && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
      {label}
    </button>
  );
}

/** A larger selectable card, used for personas / single-select tiles. */
export function OptionCard({
  label, selected, onClick, icon, description,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon: string;
  description?: string;
}) {
  const IconComponent = getIcon(icon);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 w-full text-left px-4 py-3.5 rounded-2xl border transition-all duration-200 ${
        selected
          ? 'bg-primary/5 border-primary/40 shadow-sm shadow-primary/5'
          : 'bg-background border-border hover:border-border/80 hover:bg-muted/30'
      }`}
    >
      {IconComponent && (
        <div className={`p-2 rounded-xl ${selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <IconComponent className="h-5 w-5" />
        </div>
      )}
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-bold ${selected ? 'text-primary' : 'text-foreground'}`}>{label}</span>
        {description && <span className="block text-xs text-muted-foreground mt-0.5 leading-normal">{description}</span>}
      </span>
      {selected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
    </button>
  );
}
