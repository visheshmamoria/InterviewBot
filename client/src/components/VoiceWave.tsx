interface VoiceWaveProps {
  isActive: boolean;
  amplitude?: number;
  className?: string;
}

export function VoiceWave({ isActive, amplitude = 1, className = "" }: VoiceWaveProps) {
  const bars = Array.from({ length: 7 }, (_, i) => i);
  
  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      {bars.map((bar) => (
        <div
          key={bar}
          className={`w-1 rounded-full transition-all duration-300 ${
            isActive
              ? "bg-gradient-to-t from-primary to-secondary animate-wave"
              : "bg-gray-300"
          }`}
          style={{
            height: isActive ? `${20 + Math.sin(bar * 0.5) * 15 * amplitude}px` : "8px",
            animationDelay: `${bar * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
