import { useMemo } from 'react';

interface ShapeProps {
  top: string;
  left: string;
  size: number;
  rotation: number;
  opacity: number;
  type: 'triangle' | 'shard' | 'wedge' | 'angular';
}

function generateRandomShapes(count: number, seed: number): ShapeProps[] {
  const shapes: ShapeProps[] = [];
  const types: ShapeProps['type'][] = ['triangle', 'shard', 'wedge', 'angular'];
  
  // Use a seeded pseudo-random function for consistent randomness
  const seededRandom = (n: number) => {
    const x = Math.sin(seed + n * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };
  
  for (let i = 0; i < count; i++) {
    const rand = (offset: number) => seededRandom(i * 7 + offset);
    
    shapes.push({
      top: `${rand(0) * 100}%`,
      left: `${rand(1) * 100}%`,
      size: 15 + rand(2) * 35, // 15-50px range with variation
      rotation: rand(3) * 360,
      opacity: 0.04 + rand(4) * 0.08, // 0.04-0.12 opacity range
      type: types[Math.floor(rand(5) * types.length)],
    });
  }
  
  return shapes;
}

function Shape({ top, left, size, rotation, opacity, type }: ShapeProps) {
  const getPath = () => {
    switch (type) {
      case 'triangle':
        return 'M50,5 L95,90 L5,90 Z';
      case 'shard':
        return 'M20,5 L80,15 L85,70 L50,95 L10,60 Z';
      case 'wedge':
        return 'M10,20 L90,10 L85,80 L15,90 Z';
      case 'angular':
        return 'M30,5 L75,20 L90,60 L55,95 L10,70 Z';
      default:
        return 'M50,5 L95,90 L5,90 Z';
    }
  };

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top,
        left,
        width: size,
        height: size,
        transform: `rotate(${rotation}deg) translate(-50%, -50%)`,
        opacity,
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d={getPath()} fill="#D4C4B0" />
      </svg>
    </div>
  );
}

export function BackgroundPattern() {
  // Generate shapes with different densities for mobile vs desktop
  // Using useMemo to prevent regeneration on every render
  const mobileShapes = useMemo(() => generateRandomShapes(18, 42), []);
  const desktopShapes = useMemo(() => generateRandomShapes(28, 87), []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Mobile: fewer, more scattered shapes */}
      <div className="block sm:hidden">
        {mobileShapes.map((shape, i) => (
          <Shape key={`mobile-${i}`} {...shape} />
        ))}
      </div>
      
      {/* Desktop: more shapes spread across larger canvas */}
      <div className="hidden sm:block">
        {desktopShapes.map((shape, i) => (
          <Shape key={`desktop-${i}`} {...shape} />
        ))}
      </div>
    </div>
  );
}
