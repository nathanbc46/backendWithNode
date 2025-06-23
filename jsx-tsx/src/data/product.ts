export interface Product {
    id: number
    title: string
    price: number
    quantity: number,
    tags: string[]
}

export const products: Product[] = [
    { id: 1, title: 'Product A', price: 100, quantity: 50, tags: ['tag1', 'tag2'] },
    { id: 2, title: 'Product B', price: 200, quantity: 30, tags: ['tag1', 'tag4'] },
    { id: 3, title: 'Product C', price: 150, quantity: 20, tags: ['tag1', 'tag6'] },
    { id: 4, title: 'Product D', price: 250, quantity: 10, tags: ['tag1', 'tag8'] },
] 