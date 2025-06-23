export interface User {
    id: number
    name: string,
    email: string,
    birthDate: Date,
    role: string
}

export const users: User[] = [
    { id: 1, name: 'John Doe', email: '2H4tq@example.com', birthDate: new Date('1990-01-01'), role: 'admin' },
    { id: 2, name: 'Jane Doe', email: 'H2YJt@example.com', birthDate: new Date('1995-01-01'), role: 'user' },
    { id: 3, name: 'Bob Smith', email: 't2H2YJt@example.com', birthDate: new Date('1980-01-01'), role: 'user' },
]