import React from 'react';
import { cn } from '@/lib/utils';

interface WithuLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'gradient';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

export default function WithuLogo({ size = 'md', variant = 'default', className }: WithuLogoProps) {
  const sizeClass = sizeClasses[size];
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Logo Icon - Two connected figures */}
      <div className={cn(
        'relative flex items-center justify-center',
        sizeClass
      )}>
        {/* Circle outline */}
        <div className={cn(
          'absolute rounded-full border-2',
          variant === 'white' ? 'border-white' : 'border-primary'
        )} style={{ width: '100%', height: '100%' }}></div>
        
        {/* Left figure (dark blue) */}
        <div className={cn(
          'absolute rounded-full',
          variant === 'white' ? 'bg-white' : 'bg-primary'
        )} style={{ 
          width: '60%', 
          height: '60%', 
          left: '10%', 
          top: '20%',
          clipPath: 'circle(50% at 30% 50%)'
        }}></div>
        
        {/* Right figure (green) */}
        <div className={cn(
          'absolute rounded-full',
          variant === 'white' ? 'bg-white' : 'bg-secondary'
        )} style={{ 
          width: '60%', 
          height: '60%', 
          right: '10%', 
          top: '20%',
          clipPath: 'circle(50% at 70% 50%)'
        }}></div>
      </div>
      
      {/* Logo Text */}
      <div className="flex flex-col">
        <span className={cn(
          'font-bold text-lg leading-none',
          variant === 'white' ? 'text-white' : 'text-primary'
        )}>
          withu
        </span>
        <span className={cn(
          'text-xs leading-none',
          variant === 'white' ? 'text-white/70' : 'text-muted-foreground'
        )}>
          Real Estate
        </span>
      </div>
    </div>
  );
}
