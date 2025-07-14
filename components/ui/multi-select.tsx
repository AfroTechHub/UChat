"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*                               🔌 Prop Types                                */
/* -------------------------------------------------------------------------- */
export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onSelectChange: (values: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/* -------------------------------------------------------------------------- */
/*                              🚀 MultiSelect                                */
/* -------------------------------------------------------------------------- */
export function MultiSelect({
  options,
  selected,
  onSelectChange,
  placeholder = "Select…",
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const toggleValue = (value: string) => {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    onSelectChange(next)
  }

  const selectedLabels =
    options
      .filter((opt) => selected.includes(opt.value))
      .map((opt) => opt.label)
      .join(", ") || placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", selected.length === 0 && "text-muted-foreground", className)}
        >
          {selectedLabels}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isChecked = selected.includes(option.value)
                return (
                  <CommandItem key={option.value} onSelect={() => toggleValue(option.value)} className="cursor-pointer">
                    <Check className={cn("mr-2 h-4 w-4", isChecked ? "opacity-100" : "opacity-0")} />
                    {option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
