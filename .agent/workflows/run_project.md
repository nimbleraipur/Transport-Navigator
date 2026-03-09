---
description: How to run the Admin Panel and App
---

### 1. Start the Backend Server
This runs the Express server which powers all APIs.

```bash
npm run server:dev
```
*Port: 5000*

### 2. Start the Admin Web Panel
This is the new standalone management console.

```bash
cd admin-web
npm run dev
```
*URL: http://localhost:5173 (usually)*

### 3. Start the Expo App
This runs the Customer and Driver mobile/web apps.

```bash
# For Customer Mode
npm run expo:customer

# For Driver Mode
npm run expo:driver
```
*Press `w` for web, or use the Expo Go app on mobile.*

### 4. Default Credentials
- **Phone**: `9999999999`
- **Password**: `admin123`
