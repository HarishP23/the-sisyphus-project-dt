"use client"

interface FlipClockProps {
  time: string
  color: string
}

export default function FlipClock({ time, color }: FlipClockProps) {
  const [minutes, seconds] = time.split(":")

  const Digit = ({ value }: { value: string }) => (
    <div className="relative w-20 h-28 sm:w-24 sm:h-32 md:w-32 md:h-40">
      <div
        className="absolute inset-0 rounded-lg shadow-lg flex items-center justify-center"
        style={{ backgroundColor: color }}
      >
        <span className="text-5xl sm:text-6xl md:text-7xl font-bold text-white">{value}</span>
      </div>
      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-black opacity-20" />
    </div>
  )

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <Digit value={minutes[0]} />
      <Digit value={minutes[1]} />
      <span className="text-4xl sm:text-5xl md:text-6xl font-bold" style={{ color }}>
        :
      </span>
      <Digit value={seconds[0]} />
      <Digit value={seconds[1]} />
    </div>
  )
}
