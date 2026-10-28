package com.nimble.myload24.driver

import android.content.Intent
import android.os.Build
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService
import org.json.JSONObject

class DriverFirebaseMessagingService : ExpoFirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        try {
            val data = remoteMessage.data
            val type = data["type"]
            val bookingId = data["bookingId"] ?: data["id"]

            if (type == "new_booking" && !bookingId.isNullOrEmpty()) {
                val bookingJson = JSONObject(data as Map<*, *>).toString()
                val intent = Intent(applicationContext, FloatingBubbleService::class.java).apply {
                    action = FloatingBubbleService.ACTION_SHOW_OVERLAY
                    putExtra(FloatingBubbleService.EXTRA_BOOKING_JSON, bookingJson)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    applicationContext.startForegroundService(intent)
                } else {
                    applicationContext.startService(intent)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        super.onMessageReceived(remoteMessage)
    }
}
