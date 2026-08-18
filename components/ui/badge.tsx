import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-cyan-500 text-slate-950 shadow hover:bg-cyan-400",
        secondary:
          "border-transparent bg-slate-800 text-slate-100 hover:bg-slate-700",
        destructive:
          "border-transparent bg-rose-500 text-white shadow hover:bg-rose-600",
        outline:
          "border-border/50 bg-background/55 text-foreground/70 backdrop-blur transition-colors hover:bg-background/70",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
