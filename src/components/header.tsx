import { ShieldAlert } from 'lucide-react';

export default function Header() {
  return (
    <header className="relative z-10 flex h-16 items-center border-b border-white/10 px-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-7 w-7 text-accent" style={{ filter: 'drop-shadow(0 0 5px currentColor)' }}/>
        <h1 className="font-headline text-2xl font-bold tracking-wider text-white">
          SENTINEL UKRAINE
        </h1>
      </div>
    </header>
  );
}
