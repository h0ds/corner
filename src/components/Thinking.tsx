import { motion } from "framer-motion";
import React from "react";

export const Thinking = () => {
  const [dots, setDots] = React.useState("");

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "") return ".";
        if (prev === ".") return "..";
        if (prev === "..") return "...";
        return "";
      });
  }, 500);

    return () => clearInterval(interval);
  }, []);

  const barVariants = {
    animate: (i: number) => ({
      scaleY: [0.4, 1, 0.4],
      transition: {
        duration: 1,
        repeat: Infinity,
        delay: i * 0.2,
        ease: "easeInOut"
      }
    })
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 px-4 py-2 bg-accent border dark:bg-card/80 rounded-lg shadow-none w-fit"
    >
      <div className="flex items-center gap-[2px] h-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            custom={i}
            variants={barVariants}
            animate="animate"
            className="w-[2px] h-full bg-accent-foreground rounded-full origin-bottom"
          />
        ))}
      </div>
      <span className="text-sm text-accent-foreground font-normal min-w-[70px]">
        Thinking{dots}
      </span>
    </motion.div>
  );
};
