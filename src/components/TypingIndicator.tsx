import { motion } from "framer-motion";

export const TypingIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 px-4 py-3 bg-card dark:bg-card/80 rounded-md shadow-none w-fit"
    >
      <motion.div
        className="flex gap-2"
        initial="initial"
        animate="animate"
        variants={{
          animate: {
            transition: {
              staggerChildren: 0.2,
            },
          },
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-4 h-4 bg-black dark:bg-white"
            style={{
              transformStyle: "preserve-3d",
              perspective: "1000px"
            }}
            variants={{
              initial: { opacity: 0, rotateX: 0, rotateY: 0 },
              animate: {
                opacity: 1,
                rotateX: 360,
                rotateY: 360,
                transition: {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear"
                },
              },
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};
