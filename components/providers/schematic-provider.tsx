"use client"

import type React from "react"

import { SchematicProvider } from "@schematichq/schematic-react"

export function SchematicProviderWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SchematicProvider publishableKey={process.env.NEXT_PUBLIC_SCHEMATIC_PUBLISHABLE_KEY!}>
      {children}
    </SchematicProvider>
  )
}

