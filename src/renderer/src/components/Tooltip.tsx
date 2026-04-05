import { useState, type ReactNode } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
}

export default function Tooltip({ text, children }: TooltipProps): React.JSX.Element {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => {
        setShow(true)
      }}
      onMouseLeave={() => {
        setShow(false)
      }}
    >
      {children}
      {show ? (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-neutral-800 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
        </div>
      ) : null}
    </div>
  )
}
