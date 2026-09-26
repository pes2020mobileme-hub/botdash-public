/**
 * Generate a dashboard auth token:  npm run token
 * Then paste the output into DASHBOARD_TOKEN on your host.
 */

import { generateToken } from './middleware/auth.js'

const token = generateToken()

console.log('\nสร้าง token แล้ว — เก็บไว้ที่เดียว อย่าลง git\n')
console.log(token)
console.log('\nตั้งค่า:')
console.log('  Render → Environment → DASHBOARD_TOKEN = ' + token)
console.log('  local  → bot/.env          DASHBOARD_TOKEN = ' + token)
console.log('\nเข้า dashboard ได้ที่หน้า Login โดยวาง token นี้\n')
