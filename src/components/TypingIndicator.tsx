import { motion } from "framer-motion";

export const TypingIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
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
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"
            variants={{
              initial: { y: 0 },
              animate: {
                y: [0, -5, 0],
                transition: {
                  duration: 0.6,
                  repeat: Infinity,
                  repeatType: "reverse",
                },
              },
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};
