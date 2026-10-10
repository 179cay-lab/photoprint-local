#!/bin/bash
cd "$(dirname "$0")"

echo "==================================================="
echo "    PhotoPrint Local - Khoi dong ung dung (Mac)"
echo "==================================================="
echo ""

# Kiem tra Node.js
if ! command -v node &> /dev/null; then
    echo "[Loi] May chua cai Node.js!"
    echo "Vui long tai va cai dat tai: https://nodejs.org/"
    read -p "Nhan Enter de thoat..."
    exit 1
fi

# Tu dong cai dependencies lan dau
if [ ! -d "node_modules" ]; then
    echo "[Thong bao] Dang cai dat thu vien lan dau..."
    npm install
fi

# Mo trinh duyet sau 2 giay
(sleep 2 && open http://localhost:5173) &

echo "Dang khoi chay ung dung tai http://localhost:5173..."
npm run dev
