import { motion } from 'framer-motion';
import geometricPattern from "@assets/Screenshot_2026-01-09_at_2.33.22_AM_1767947608832.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      onAnimationComplete={() => {
        setTimeout(onComplete, 2000);
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <motion.img
          src={geometricPattern}
          alt=""
          className="absolute w-[200%] h-[200%] object-cover opacity-[0.08]"
          initial={{ x: "-25%", y: "-25%", rotate: 0 }}
          animate={{ 
            x: ["-25%", "-15%", "-25%"],
            y: ["-25%", "-20%", "-25%"],
            rotate: [0, 2, 0]
          }}
          transition={{
            duration: 8,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      </div>
      
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6"
        >
          <svg 
            width="120" 
            height="40" 
            viewBox="0 0 120 40" 
            className="text-[#EA2C00]"
          >
            <text 
              x="0" 
              y="32" 
              className="font-bold text-3xl fill-current"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              abridge
            </text>
          </svg>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="text-[#6B7280] text-sm font-medium tracking-wide"
        >
          ROI Calculator
        </motion.div>
        
        <motion.div
          className="mt-8 flex gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-[#EA2C00]"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
