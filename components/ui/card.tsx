import React from 'react';

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl shadow-md bg-white p-4 ${className}`}>
      {children}
    </div>
  );
}

type CardContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`p-2 ${className}`}>
      {children}
    </div>
  );
}

