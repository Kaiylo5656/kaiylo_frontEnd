import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, style, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[0.5px] focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-base",
        className
      )}
      style={{
        borderStyle: 'none',
        borderWidth: '0px',
        borderColor: 'rgba(0, 0, 0, 0)',
        borderImage: 'none',
        ...style
      }}
      ref={ref}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
