import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tracking-wide font-mono",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/10 text-primary backdrop-blur-sm font-semibold",
        secondary:
          "border-border/80 bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive",
        outline:
          "border-border/80 bg-card/40 text-muted-foreground backdrop-blur-sm hover:border-primary/50 hover:text-primary transition-colors",
        accent:
          "border-primary/40 bg-primary/15 text-primary font-semibold",
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
