export type Metadata = {
  orderNumber: string
  customerName: string
  customerEmail: string
  clerkUserId: string
}

export type GroupedBasketItem = {
  product: {
    _id: string
    name: string
    images?: string[]
  }
  quantity: number
  selectedSizeDetails?: {
    size: string
    stock: number
    price: number
  }
}

