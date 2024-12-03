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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 px-0.5 py-0.5 bg-accent border dark:bg-card/80 rounded-lg shadow-none w-fit"
    >
      <motion.img 
        src="/icon.png" 
        alt="Corner" 
        className="h-8 w-8"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <span className="text-sm text-accent-foreground font-normal min-w-[70px]">
        Thinking{dots}
      </span>
    </motion.div>
  );
};
