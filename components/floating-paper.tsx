"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { FileText } from "lucide-react"

export function FloatingPaper({ count = 5 }) {
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })
  const [isClient, setIsClient] = useState(false)

  // Generate consistent positions for each paper using index-based seeding
  const paperPositions = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      // Use index-based pseudo-random values for consistent SSR/client rendering
      const seed1 = (i * 123.456) % 1
      const seed2 = (i * 789.012) % 1
      const seed3 = (i * 345.678) % 1
      const seed4 = (i * 901.234) % 1
      const seed5 = (i * 567.890) % 1
      const seed6 = (i * 234.567) % 1
      
      return {
        initial: {
          x: seed1 * dimensions.width,
          y: seed2 * dimensions.height,
        },
        animate: {
          x: [
            seed1 * dimensions.width,
            seed3 * dimensions.width,
            seed5 * dimensions.width,
          ],
          y: [
            seed2 * dimensions.height,
            seed4 * dimensions.height,
            seed6 * dimensions.height,
          ],
        },
        duration: 20 + seed1 * 10,
      }
    })
  }, [count, dimensions.width, dimensions.height])

  useEffect(() => {
    setIsClient(true)
    // Update dimensions only on client side
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    })

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="relative w-full h-full">
      {paperPositions.map((position, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={position.initial}
          animate={{
            x: position.animate.x,
            y: position.animate.y,
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: position.duration,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        >
          <div className="relative w-16 h-20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center transform hover:scale-110 transition-all duration-300 shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 hover:border-purple-400/30">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-xl opacity-50" />
            <FileText className="w-8 h-8 text-purple-300/70 relative z-10" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-purple-400/50 rounded-full animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

