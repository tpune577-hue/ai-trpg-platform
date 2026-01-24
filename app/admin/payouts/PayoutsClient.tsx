'use client'

import { useState } from 'react'

interface PayoutData {
    sellerId: string
    sellerName: string
    bankName: string
    bankAccount: string
    totalItems: number
    totalSales: number // ยอดขายรวม
    platformFee: number // ค่าธรรมเนียม (สมมติ 10%)
    netPayout: number // ยอดที่ต้องโอนจริง
}

export default function PayoutsClient({ data }: { data: PayoutData[] }) {

    // ฟังก์ชันดาวน์โหลด CSV
    const downloadCSV = () => {
        // 1. สร้าง Header
        const headers = ["Seller Name", "Bank Name", "Account Number", "Total Items", "Total Sales (THB)", "Platform Fee (10%)", "Net Payout (THB)"]

        // 2. แปลงข้อมูลเป็น CSV Rows
        const rows = data.map(item => [
            `"${item.sellerName}"`, // ใส่ "" กันกรณีมี comma ในชื่อ
            item.bankName,
            `"${item.bankAccount}"`, // ใส่ "" เพื่อกัน Excel แปลงเป็น Scientific Notation
            item.totalItems,
            item.totalSales,
            item.platformFee,
            item.netPayout
        ])

        // 3. รวมร่าง (ใส่ BOM \uFEFF เพื่อให้ Excel อ่านภาษาไทยออก)
        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n")

        // 4. สั่ง Browser ให้ Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", `payouts_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">

            {/* Toolbar */}
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-sm">
                    Found <span className="text-white font-bold">{data.length}</span> sellers with earnings.
                </div>
                <button
                    onClick={downloadCSV}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                    📄 Export CSV
                </button>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-4">Seller Info</th>
                            <th className="px-6 py-4">Bank Details</th>
                            <th className="px-6 py-4 text-right">Items Sold</th>
                            <th className="px-6 py-4 text-right">Total Sales</th>
                            <th className="px-6 py-4 text-right text-red-400">Fee (10%)</th>
                            <th className="px-6 py-4 text-right text-emerald-400">Net Payout</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center">No pending payouts found.</td></tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.sellerId} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-white">{item.sellerName}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-white">{item.bankName}</span>
                                            <span className="font-mono text-xs">{item.bankAccount}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono">{item.totalItems}</td>
                                    <td className="px-6 py-4 text-right font-mono text-white">{item.totalSales.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-mono text-red-400">-{item.platformFee.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold text-lg">
                                        {item.netPayout.toLocaleString()} ฿
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}