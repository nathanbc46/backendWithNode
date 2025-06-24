import { Attendance, type IAttendance } from "./Attendance.js";

export interface IEmployee {
    id: number
    name: string
    email: string
    role: string
}

export interface IEmployeeWithAttendance extends IEmployee {
    attendances: IAttendance[];
}

export class Employee {
    static _employee: IEmployee[] = [ // ประกาศตัวแปรแบบ static เพื่อเรียกใช้ โดยไม่ต้องสร้าง instance
        { id: 1, name: 'John Doe', email: '2H4tq@example.com', role: 'admin' },
        { id: 2, name: 'Jane Doe', email: 'H2YJt@example.com', role: 'user' },
        { id: 3, name: 'Bob Smith', email: 't2H2YJt@example.com', role: 'user' },
    ];

    //เมื่อมีการเรียก .employees จะเรียกใช้ get employees
    static get employees(): IEmployeeWithAttendance[] {
        return this._employee.map((employee) => ({
            ...employee,
            attendances: Attendance.getFromUserId(employee.id)
        }))
    }

    static getAll(): IEmployeeWithAttendance[] { // ประกาศ Method แบบ static เพื่อเรียกใช้ โดยไม่ต้องสร้าง instance
        return this.employees
    }

    static getOne(id: number): IEmployeeWithAttendance | undefined {
        return this.employees.find((employee) => employee.id === id)
    }

    static create(employee: Omit<IEmployee, 'id'>): IEmployee { // Omit<IEmployee, 'id'> คือการลบค่า id ออก จาก IEmployee
        const newEmployee = { ...employee, id: this._employee.length + 1 } // ...employee คือการสร้าง object ใหม่จาก employee
        this._employee.push(newEmployee) // เพิ่มข้อมูลใหม่เข้าไปใน array
        return newEmployee
    }

    static update(id: number, employee: Omit<IEmployee, 'id'>): IEmployee {
        const index = this._employee.findIndex((employee) => employee.id === id)
        if (index === -1) {
            throw new Error('Employee not found')
        }
        this._employee[index] = { ...this._employee[index], ...employee } // { ...this._employee[index], ...employee } คือการสร้าง object ใหม่จาก this._employee[index] และ employee
        return this._employee[index]
    }

    static delete(id: number): void {
        const index = this._employee.findIndex((employee) => employee.id === id)
        if (index === -1) {
            throw new Error('Employee not found')
        }
        this._employee.splice(index, 1)
    }

}