import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { PrismaClient } from "@prisma/client"
import { openAPI } from "better-auth/plugins"
import { createTransport, getTestMessageUrl } from "nodemailer"
import { config } from "dotenv"

config()
const prisma = new PrismaClient()

// คือ การสร้างตัวส่งอีเมลด้วย Nodemailer
const transport = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    }
})

// ฟังก์ชันนี้ใช้สำหรับส่งอีเมล
async function sendMail({ to, subject, html }: { to: string, subject: string, html: string }) {
    const info = await transport.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html
    })
    if (process.env.NODE_ENV === 'development') {
        console.log('Message sent: %s', info.messageId)
        console.log('Preview URL: %s', getTestMessageUrl(info))
    } else {
        console.log(`Email sent to ${to} with subject "${subject}"`)
    }
}

// การกำหนดค่า BetterAuth
export const auth = betterAuth({
    emailAndPassword: { //การเปิดใช้งานการเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
        enabled: true,
        requireEmailVerification: true, //ต้องยืนยันอีเมลก่อนเข้าสู่ระบบ
    },
    emailVerification: { //การเปิดใช้งานการยืนยันอีเมล
        async sendVerificationEmail({ user, url }) { //ฟังก์ชันนี้จะถูกเรียกเมื่อผู้ใช้ต้องการยืนยันอีเมล
            await sendMail({ //การส่งอีเมลยืนยัน
                to: user.email,
                subject: "Verify your email",
                html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`
            })
        }
    },
    socialProviders: { //การเปิดใช้งานผู้ให้บริการโซเชียล
        google: { //การเปิดใช้งาน Google OAuth
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
    },
    database: prismaAdapter(prisma, { //การใช้ Prisma Adapter สำหรับเชื่อมต่อกับฐานข้อมูล
        provider: "postgresql",
    }),
    plugins: [ //การใช้ปลั๊กอินต่างๆ
        openAPI() //ปลั๊กอินสำหรับสร้าง OpenAPI documentation
    ],
})