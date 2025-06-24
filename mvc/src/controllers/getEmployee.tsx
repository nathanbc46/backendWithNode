import { createFactory } from "hono/factory"
import { ViewEmployee } from "../views/ViewEmployee.js"
import { Employee } from "../models/Employee.js"
import { ViewHome } from "../views/ViewHome.js"

const factory = createFactory()

export const getEmployee = factory.createHandlers((c) => {
    const id = Number(c.req.param("id"))
    const employee = Employee.getOne(id)
    if (!employee) {
        return c.notFound()
    }
    return c.html(<ViewEmployee employee={employee}></ViewEmployee>)
})