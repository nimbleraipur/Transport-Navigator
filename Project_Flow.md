# Transport Navigator (My Load 24) - Project Flow

Yeh project ek complete transport aur logistics mobile application hai (jaise Rapido, Porter). Isme teen main components hain: Customer App, Driver App, aur Admin Panel.

Neeche project ka step-by-step flow samjhaya gaya hai:

## 1. Customer App Flow (Grahak ke liye)
1. **Login & Registration:** Customer apna mobile number daalkar OTP se login karta hai aur profile complete karta hai.
2. **Location Selection:** Customer apna Pickup location aur Delivery location select karta hai (Indore region).
3. **Vehicle Selection:** Customer ko apni jarurat ke hisaab se vehicle choose karna hota hai:
   - Auto (200 kg tak)
   - Tempo (1000 kg tak)
   - Truck (5000 kg tak)
4. **Pricing & Booking:** Vehicle select karne ke baad estimated fare display hota hai. Fir customer apni booking confirm karta hai.
5. **Driver Assignment:** Booking request nearest available driver ko chali jati hai. Jab driver accept karta hai, system driver ko assign kar deta hai.
6. **Ride Start (OTP Verification):** Driver jab pickup location par pahunchta hai, customer ko usse ek OTP share karna padta hai trip start karne ke liye.
7. **Tracking & Completion:** Customer real-time track kar sakta hai. Jab delivery poori ho jati hai, customer driver ko rate (review) karta hai.

## 2. Driver App Flow (Driver ke liye)
1. **Login & Registration:** Driver app me mobile number aur OTP se login karta hai, fir apni profile, vehicle type, aur gaadi ka number dalkar register hota hai.
2. **Go Online:** Dashboard par aakar driver khud ko 'Online' mark karta hai taaki use booking requests mil sakein. Socket.IO ke through real-time notifications aati hain.
3. **Accepting Ride:** Jab koi customer booking karta hai, driver ke paas popup aata hai aur wo use Accept kar sakta hai.
4. **Pickup & OTP:** Driver pickup location par jaakar customer se OTP leta hai aur enter karke booking/journey start karta hai.
5. **Delivery Completion:** Drop location par pahunchne ke baad, driver 'Complete Delivery' par click karta hai.
6. **Earnings:** Driver apne dashboard par apni earnings aur pichli rides ki history dekh sakta hai.

## 3. Admin Panel Flow (Management ke liye)
1. **Login:** Admin apne portal (e.g. `http://localhost:5000/admin`) par phone aur password (default: 9999999999 / admin123) ka use karke log in karta hai.
2. **Dashboard Overview:** Yahan admin ko kitne customers hain, kitne drivers active hain, aur aaj kitni bookings hui hai uski statistics milti hai.
3. **User & Driver Management:** Admin naye register hue drivers ki details dekh kar unhe 'Approve' ya reject kar sakta hai. System automatically nayi IDs bhi banata hai.
4. **Vehicle Pricing:** Admin alag-alag vehicle types ka Base Fare aur Per KM rate modify kar sakta hai.
5. **Live Tracking:** Admin live sari chal rahi bookings (active rides) status ke sath track kar sakta hai.

---

**Technical Flow Summary:**
- **Frontend/Mobile App:** React Native (Expo) se bani hai, jise `EXPO_PUBLIC_APP_MODE` environment variable se Customer ya Driver app me switch kiya jata hai.
- **Backend API:** Node.js (Express) par bana hai jo HTTP API aur Socket.IO ka use karke real-time connection deta hai.
- **Database:** MongoDB Atlas use kiya gaya hai jisme Users, Bookings, Vehicles aur Reviews ka sara data store hota hai.
