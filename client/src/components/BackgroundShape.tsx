export function BackgroundShape() {
  return (
    <div 
      className="fixed bottom-0 right-0 pointer-events-none z-0"
      style={{
        width: '600px',
        height: '500px',
      }}
    >
      <svg 
        viewBox="0 0 600 500" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ opacity: 0.07 }}
      >
        <polygon 
          points="600,500 400,500 450,350 550,300 600,380" 
          fill="#E8DCCE"
        />
        <polygon 
          points="550,300 450,350 480,250 560,220" 
          fill="#E8DCCE"
        />
        <polygon 
          points="600,380 550,300 560,220 600,200" 
          fill="#E8DCCE"
        />
        <polygon 
          points="480,250 450,350 380,320 420,200" 
          fill="#E8DCCE"
        />
        <polygon 
          points="560,220 480,250 500,150 580,120" 
          fill="#E8DCCE"
        />
      </svg>
    </div>
  );
}
