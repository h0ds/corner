import { motion } from "framer-motion";
import React from "react";

export const TypingIndicator = () => {
  const [numDots, setNumDots] = React.useState(1);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setNumDots(prev => prev < 6 ? prev * 2 : prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-center px-3 py-3 bg-accent-foreground dark:bg-card/80 rounded-full shadow-none w-fit"
    >
      <div className="relative h-1 w-1">
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {[...Array(numDots)].map((_, i) => {
            const angle = (i * 360) / numDots;
            const radius = 8; // Reduced distance from center
            
            return (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: -2,
                  marginTop: -2,
                  transform: `rotate(${angle}deg) translateY(-${radius}px)`
                }}
              />
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
};
