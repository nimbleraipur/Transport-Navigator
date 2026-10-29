package com.nimble.myload24.driver

import android.animation.ValueAnimator
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.media.MediaPlayer
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.CountDownTimer
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.text.TextUtils
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.LinearInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import org.json.JSONObject

class FloatingBubbleService : Service() {

    private var windowManager: WindowManager? = null
    private var bubbleView: View? = null
    private var overlayCardView: View? = null
    private var bubbleParams: WindowManager.LayoutParams? = null
    private var ringtone: Ringtone? = null
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var overlayTimer: CountDownTimer? = null
    private var progressAnimator: ValueAnimator? = null

    companion object {
        const val ACTION_SHOW_BUBBLE = "com.nimble.myload24.driver.ACTION_SHOW_BUBBLE"
        const val ACTION_HIDE_BUBBLE = "com.nimble.myload24.driver.ACTION_HIDE_BUBBLE"
        const val ACTION_SHOW_OVERLAY = "com.nimble.myload24.driver.ACTION_SHOW_OVERLAY"
        const val ACTION_HIDE_OVERLAY = "com.nimble.myload24.driver.ACTION_HIDE_OVERLAY"
        const val EXTRA_BOOKING_JSON = "extra_booking_json"
        const val CHANNEL_ID = "myload24_driver_overlay_channel"
        const val NOTIFICATION_ID = 2004
        @JvmStatic
        var lastAcceptedBookingId: String? = null
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        try {
            windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
            createNotificationChannel()
            val notification = buildForegroundNotification()
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_STICKY

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf()
            return START_NOT_STICKY
        }

        when (action) {
            ACTION_SHOW_BUBBLE -> {
                showBubbleView()
            }
            ACTION_HIDE_BUBBLE -> {
                hideBubbleView()
                hideOverlayCard()
            }
            ACTION_SHOW_OVERLAY -> {
                val bookingJson = intent.getStringExtra(EXTRA_BOOKING_JSON)
                showIncomingRequestOverlay(bookingJson)
            }
            ACTION_HIDE_OVERLAY -> {
                hideOverlayCard()
                showBubbleView()
            }
        }

        return START_STICKY
    }

    private fun getOverlayType(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
    }

    private fun showBubbleView() {
        if (bubbleView != null) return

        try {
            val dpToPx = resources.displayMetrics.density
            val bubbleSize = (60 * dpToPx).toInt()

            bubbleParams = WindowManager.LayoutParams(
                bubbleSize,
                bubbleSize,
                getOverlayType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = resources.displayMetrics.widthPixels - bubbleSize - (16 * dpToPx).toInt()
                y = (resources.displayMetrics.heightPixels * 0.4).toInt()
            }

            val bubble = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                val bg = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.parseColor("#0A1628"))
                    setStroke((2.5 * dpToPx).toInt(), Color.parseColor("#10B981"))
                }
                background = bg
                elevation = 16f
            }

            val icon = ImageView(this).apply {
                val iconRes = if (applicationInfo.icon != 0) applicationInfo.icon else android.R.drawable.ic_dialog_info
                setImageResource(iconRes)
                val pad = (8 * dpToPx).toInt()
                setPadding(pad, pad, pad, pad)
            }
            bubble.addView(icon, LinearLayout.LayoutParams(bubbleSize, bubbleSize))

            var initialX = 0
            var initialY = 0
            var initialTouchX = 0f
            var initialTouchY = 0f
            var isClick = false

            bubble.setOnTouchListener { _, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = bubbleParams!!.x
                        initialY = bubbleParams!!.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        isClick = true
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val dx = (event.rawX - initialTouchX).toInt()
                        val dy = (event.rawY - initialTouchY).toInt()
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                            isClick = false
                        }
                        bubbleParams!!.x = initialX + dx
                        bubbleParams!!.y = initialY + dy
                        windowManager?.updateViewLayout(bubble, bubbleParams)
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        if (isClick) {
                            bringAppToForeground(null)
                        } else {
                            val screenWidth = resources.displayMetrics.widthPixels
                            val snapX = if (bubbleParams!!.x + bubbleSize / 2 < screenWidth / 2) {
                                (10 * dpToPx).toInt()
                            } else {
                                screenWidth - bubbleSize - (10 * dpToPx).toInt()
                            }
                            bubbleParams!!.x = snapX
                            windowManager?.updateViewLayout(bubble, bubbleParams)
                        }
                        true
                    }
                    else -> false
                }
            }

            bubbleView = bubble
            windowManager?.addView(bubbleView, bubbleParams)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun hideBubbleView() {
        try {
            bubbleView?.let {
                windowManager?.removeView(it)
                bubbleView = null
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun showIncomingRequestOverlay(bookingJsonStr: String?) {
        hideOverlayCard()

        try {
            val dpToPx = resources.displayMetrics.density
            val screenWidth = resources.displayMetrics.widthPixels
            val cardWidth = (screenWidth - (24 * dpToPx).toInt()).coerceAtMost((480 * dpToPx).toInt())

            val cardParams = WindowManager.LayoutParams(
                cardWidth,
                WindowManager.LayoutParams.WRAP_CONTENT,
                getOverlayType(),
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                x = 0
                y = (36 * dpToPx).toInt()
            }

            var customerName = "Customer"
            var fare = "0"
            var pickupName = "Pickup Location"
            var pickupArea = ""
            var dropName = "Drop Location"
            var dropArea = ""
            var vehicleType = "Vehicle"
            var bookingId = ""
            var distance = "0"

            if (!bookingJsonStr.isNullOrEmpty()) {
                try {
                    val obj = JSONObject(bookingJsonStr)
                    bookingId = obj.optString("id", obj.optString("bookingId", ""))
                    customerName = obj.optString("customerName", "Customer")
                    fare = obj.optString("totalPrice", obj.optString("price", obj.optString("fare", "0")))
                    vehicleType = obj.optString("vehicleType", "Vehicle")
                    distance = obj.optString("distance", "0")

                    val pickup = obj.optJSONObject("pickup")
                    if (pickup != null) {
                        pickupName = pickup.optString("name", pickup.optString("address", "Pickup Location"))
                        pickupArea = pickup.optString("area", "")
                    } else {
                        pickupName = obj.optString("pickupAddress", "Pickup Location")
                    }

                    val delivery = obj.optJSONObject("delivery")
                    if (delivery != null) {
                        dropName = delivery.optString("name", delivery.optString("address", "Drop Location"))
                        dropArea = delivery.optString("area", "")
                    } else {
                        dropName = obj.optString("dropAddress", "Drop Location")
                    }
                } catch (ex: Exception) {
                    ex.printStackTrace()
                }
            }

            // Outer Card Container (White with rounded corners 20dp & border #E5E7EB, elevation 16)
            val cardLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                val bg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = 20 * dpToPx
                    setColor(Color.WHITE)
                    setStroke((1.5 * dpToPx).toInt(), Color.parseColor("#E5E7EB"))
                }
                background = bg
                elevation = 16f
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    clipToOutline = true
                }
            }

            // 1. Top Progress Track & Bar (height 4dp, #F3F4F6 track, solid black bar)
            val progressTrack = FrameLayout(this).apply {
                val trackBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    setColor(Color.parseColor("#F3F4F6"))
                }
                background = trackBg
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    (4 * dpToPx).toInt()
                )
            }

            val progressBar = View(this).apply {
                setBackgroundColor(Color.BLACK)
                layoutParams = FrameLayout.LayoutParams(
                    cardWidth,
                    (4 * dpToPx).toInt()
                )
            }
            progressTrack.addView(progressBar)
            cardLayout.addView(progressTrack)

            // Content Container with exact padding: 16dp horizontal, 10dp top, 12dp bottom
            val contentLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                val padH = (16 * dpToPx).toInt()
                val padT = (10 * dpToPx).toInt()
                val padB = (12 * dpToPx).toInt()
                setPadding(padH, padT, padH, padB)
            }

            // 2. TOP HEADER ROW: Price + Vehicle Chip on Left, Timer Badge on Right
            val topRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = (4 * dpToPx).toInt()
                }
                layoutParams = lp
            }

            // Price & Vehicle Chip
            val priceGroup = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }

            val priceValue = TextView(this).apply {
                text = "₹$fare"
                textSize = 28f
                setTextColor(Color.BLACK)
                paint.isFakeBoldText = true
            }
            priceGroup.addView(priceValue)

            val vehicleChip = TextView(this).apply {
                text = vehicleType.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
                textSize = 11f
                setTextColor(Color.BLACK)
                paint.isFakeBoldText = true
                val chipBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = 8 * dpToPx
                    setColor(Color.parseColor("#F3F4F6"))
                    setStroke((1 * dpToPx).toInt(), Color.parseColor("#E5E7EB"))
                }
                background = chipBg
                val padX = (8 * dpToPx).toInt()
                val padY = (3 * dpToPx).toInt()
                setPadding(padX, padY, padX, padY)
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginStart = (8 * dpToPx).toInt()
                }
                layoutParams = lp
            }
            priceGroup.addView(vehicleChip)
            topRow.addView(priceGroup)

            // Spacer
            val spacer = View(this).apply {
                layoutParams = LinearLayout.LayoutParams(0, 0, 1f)
            }
            topRow.addView(spacer)

            // Timer Badge: Solid Black with clock icon and white text (e.g. ⏱ 30s)
            val timerBadgeContainer = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                val badgeBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = 12 * dpToPx
                    setColor(Color.BLACK)
                }
                background = badgeBg
                val padX = (8 * dpToPx).toInt()
                val padY = (3.5 * dpToPx).toInt()
                setPadding(padX, padY, padX, padY)
            }

            val timerIconRes = resources.getIdentifier("ic_time_white", "drawable", packageName)
            if (timerIconRes != 0) {
                val clockIcon = ImageView(this).apply {
                    setImageResource(timerIconRes)
                    val iconSize = (13 * dpToPx).toInt()
                    val lp = LinearLayout.LayoutParams(iconSize, iconSize).apply {
                        marginEnd = (4 * dpToPx).toInt()
                    }
                    layoutParams = lp
                }
                timerBadgeContainer.addView(clockIcon)
            }

            val timerText = TextView(this).apply {
                text = "30s"
                textSize = 11f
                setTextColor(Color.WHITE)
                paint.isFakeBoldText = true
            }
            timerBadgeContainer.addView(timerText)
            topRow.addView(timerBadgeContainer)

            contentLayout.addView(topRow)

            // Divider Line (#F3F4F6, 1dp, 6dp margin)
            val divider = View(this).apply {
                setBackgroundColor(Color.parseColor("#F3F4F6"))
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    (1 * dpToPx).toInt()
                ).apply {
                    topMargin = (6 * dpToPx).toInt()
                    bottomMargin = (6 * dpToPx).toInt()
                }
                layoutParams = lp
            }
            contentLayout.addView(divider)

            // 3. MIDDLE ROUTE TIMELINE: Matching IncomingRequestModal Black & White design
            val routeContainer = FrameLayout(this).apply {
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (3 * dpToPx).toInt()
                    bottomMargin = (3 * dpToPx).toInt()
                }
                layoutParams = lp
            }

            // Connecting timeline vertical line (1.5dp, #E5E7EB, centered at 8dp from left)
            val routeLine = View(this).apply {
                setBackgroundColor(Color.parseColor("#E5E7EB"))
                val lp = FrameLayout.LayoutParams(
                    (1.5 * dpToPx).toInt().coerceAtLeast(1),
                    FrameLayout.LayoutParams.MATCH_PARENT
                ).apply {
                    marginStart = (8 * dpToPx).toInt()
                    topMargin = (12 * dpToPx).toInt()
                    bottomMargin = (14 * dpToPx).toInt()
                }
                layoutParams = lp
            }
            routeContainer.addView(routeLine)

            val routeColumn = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
                )
            }

            // PICKUP ROW
            val pickupRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.TOP
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (2 * dpToPx).toInt()
                    bottomMargin = (4 * dpToPx).toInt()
                }
                layoutParams = lp
            }

            // Pickup Dot: Outer 14dp circle (White with 2dp black border) + Inner 4dp black dot
            val pickupDotOuter = FrameLayout(this).apply {
                val bg = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.WHITE)
                    setStroke((2 * dpToPx).toInt(), Color.BLACK)
                }
                background = bg
                val size = (14 * dpToPx).toInt()
                val lp = LinearLayout.LayoutParams(size, size).apply {
                    marginStart = (2 * dpToPx).toInt()
                    marginEnd = (10 * dpToPx).toInt()
                    topMargin = (3 * dpToPx).toInt()
                }
                layoutParams = lp
            }
            val pickupDotInner = View(this).apply {
                val bg = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.BLACK)
                }
                background = bg
                val dotSize = (4 * dpToPx).toInt()
                val lp = FrameLayout.LayoutParams(dotSize, dotSize).apply {
                    gravity = Gravity.CENTER
                }
                layoutParams = lp
            }
            pickupDotOuter.addView(pickupDotInner)
            pickupRow.addView(pickupDotOuter)

            // Pickup Details
            val pickupDetails = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            val pickupLabelRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }
            val pickupLabel = TextView(this).apply {
                text = "PICKUP"
                textSize = 9f
                setTextColor(Color.BLACK)
                paint.isFakeBoldText = true
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    letterSpacing = 0.08f
                }
            }
            pickupLabelRow.addView(pickupLabel)

            val pickupBadge = TextView(this).apply {
                val distNum = distance.toDoubleOrNull() ?: 0.0
                text = if (distNum > 0) String.format("%.1f km trip", distNum) else "Nearby"
                textSize = 9.5f
                setTextColor(Color.parseColor("#666666"))
                paint.isFakeBoldText = true
                val badgeBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = 4 * dpToPx
                    setColor(Color.parseColor("#F3F4F6"))
                    setStroke((1 * dpToPx).toInt(), Color.parseColor("#E5E7EB"))
                }
                background = badgeBg
                val padX = (6 * dpToPx).toInt()
                val padY = (1 * dpToPx).toInt()
                setPadding(padX, padY, padX, padY)
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginStart = (6 * dpToPx).toInt()
                }
                layoutParams = lp
            }
            pickupLabelRow.addView(pickupBadge)
            pickupDetails.addView(pickupLabelRow)

            val pickupMainText = TextView(this).apply {
                text = pickupName
                textSize = 13f
                setTextColor(Color.BLACK)
                paint.isFakeBoldText = true
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (1 * dpToPx).toInt()
                }
                layoutParams = lp
            }
            pickupDetails.addView(pickupMainText)

            if (pickupArea.isNotEmpty()) {
                val pickupAreaText = TextView(this).apply {
                    text = pickupArea
                    textSize = 10.5f
                    setTextColor(Color.parseColor("#666666"))
                    maxLines = 1
                    ellipsize = TextUtils.TruncateAt.END
                }
                pickupDetails.addView(pickupAreaText)
            }
            pickupRow.addView(pickupDetails)
            routeColumn.addView(pickupRow)

            // DROP ROW
            val dropRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.TOP
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (4 * dpToPx).toInt()
                    bottomMargin = (2 * dpToPx).toInt()
                }
                layoutParams = lp
            }

            // Drop Dot: Outer 14dp rounded square cornerRadius 3dp (solid black) + Inner 4dp white dot
            val dropDotOuter = FrameLayout(this).apply {
                val bg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = 3 * dpToPx
                    setColor(Color.BLACK)
                }
                background = bg
                val size = (14 * dpToPx).toInt()
                val lp = LinearLayout.LayoutParams(size, size).apply {
                    marginStart = (2 * dpToPx).toInt()
                    marginEnd = (10 * dpToPx).toInt()
                    topMargin = (3 * dpToPx).toInt()
                }
                layoutParams = lp
            }
            val dropDotInner = View(this).apply {
                val bg = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.WHITE)
                }
                background = bg
                val dotSize = (4 * dpToPx).toInt()
                val lp = FrameLayout.LayoutParams(dotSize, dotSize).apply {
                    gravity = Gravity.CENTER
                }
                layoutParams = lp
            }
            dropDotOuter.addView(dropDotInner)
            dropRow.addView(dropDotOuter)

            // Drop Details
            val dropDetails = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            val dropLabelRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }
            val dropLabel = TextView(this).apply {
                text = "DROP"
                textSize = 9f
                setTextColor(Color.BLACK)
                paint.isFakeBoldText = true
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    letterSpacing = 0.08f
                }
            }
            dropLabelRow.addView(dropLabel)

            val dropBadge = TextView(this).apply {
                val distNum = distance.toDoubleOrNull() ?: 0.0
                text = if (distNum > 0) String.format("%.1f km trip", distNum) else "Direct Trip"
                textSize = 9.5f
                setTextColor(Color.parseColor("#666666"))
                paint.isFakeBoldText = true
                val badgeBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = 4 * dpToPx
                    setColor(Color.parseColor("#F3F4F6"))
                    setStroke((1 * dpToPx).toInt(), Color.parseColor("#E5E7EB"))
                }
                background = badgeBg
                val padX = (6 * dpToPx).toInt()
                val padY = (1 * dpToPx).toInt()
                setPadding(padX, padY, padX, padY)
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginStart = (6 * dpToPx).toInt()
                }
                layoutParams = lp
            }
            dropLabelRow.addView(dropBadge)
            dropDetails.addView(dropLabelRow)

            val dropMainText = TextView(this).apply {
                text = dropName
                textSize = 13f
                setTextColor(Color.BLACK)
                paint.isFakeBoldText = true
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (1 * dpToPx).toInt()
                }
                layoutParams = lp
            }
            dropDetails.addView(dropMainText)

            if (dropArea.isNotEmpty()) {
                val dropAreaText = TextView(this).apply {
                    text = dropArea
                    textSize = 10.5f
                    setTextColor(Color.parseColor("#666666"))
                    maxLines = 1
                    ellipsize = TextUtils.TruncateAt.END
                }
                dropDetails.addView(dropAreaText)
            }
            dropRow.addView(dropDetails)
            routeColumn.addView(dropRow)

            routeContainer.addView(routeColumn)
            contentLayout.addView(routeContainer)

            // 4. ACTION BUTTONS ROW: Cancel (flex 1) + Accept Ride (flex 2)
            val actionRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    (44 * dpToPx).toInt()
                ).apply {
                    topMargin = (10 * dpToPx).toInt()
                }
                layoutParams = lp
            }

            // Cancel Button: flex 1, rounded 12dp, #F3F4F6 with #E5E7EB border
            val cancelBtn = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER
                val cancelBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = 12 * dpToPx
                    setColor(Color.parseColor("#F3F4F6"))
                    setStroke((1 * dpToPx).toInt(), Color.parseColor("#E5E7EB"))
                }
                background = cancelBg
                val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f).apply {
                    marginEnd = (10 * dpToPx).toInt()
                }
                layoutParams = lp
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    hideOverlayCard()
                }
            }

            val cancelIconRes = resources.getIdentifier("ic_close_black", "drawable", packageName)
            if (cancelIconRes != 0) {
                val cancelIcon = ImageView(this).apply {
                    setImageResource(cancelIconRes)
                    val iconSize = (16 * dpToPx).toInt()
                    val lp = LinearLayout.LayoutParams(iconSize, iconSize).apply {
                        marginEnd = (5 * dpToPx).toInt()
                    }
                    layoutParams = lp
                }
                cancelBtn.addView(cancelIcon)
            }

            val cancelText = TextView(this).apply {
                text = "Cancel"
                textSize = 13f
                setTextColor(Color.BLACK)
                paint.isFakeBoldText = true
            }
            cancelBtn.addView(cancelText)
            actionRow.addView(cancelBtn)

            // Accept Button: flex 2, rounded 12dp, solid black #000000, elevation 4
            val acceptBtn = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER
                val acceptBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = 12 * dpToPx
                    setColor(Color.BLACK)
                }
                background = acceptBg
                elevation = 4 * dpToPx
                val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 2f)
                layoutParams = lp
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    hideOverlayCard()
                    bringAppToForeground(bookingId)
                }
            }

            val steeringIconRes = resources.getIdentifier("ic_steering_wheel", "drawable", packageName)
            if (steeringIconRes != 0) {
                val acceptIcon = ImageView(this).apply {
                    setImageResource(steeringIconRes)
                    val iconSize = (18 * dpToPx).toInt()
                    val lp = LinearLayout.LayoutParams(iconSize, iconSize).apply {
                        marginEnd = (6 * dpToPx).toInt()
                    }
                    layoutParams = lp
                }
                acceptBtn.addView(acceptIcon)
            }

            val acceptText = TextView(this).apply {
                text = "Accept Ride"
                textSize = 14f
                setTextColor(Color.WHITE)
                paint.isFakeBoldText = true
            }
            acceptBtn.addView(acceptText)
            actionRow.addView(acceptBtn)

            contentLayout.addView(actionRow)
            cardLayout.addView(contentLayout)
            overlayCardView = cardLayout

            windowManager?.addView(overlayCardView, cardParams)

            // 30-Second Countdown & Progress Bar Animation
            overlayTimer?.cancel()
            overlayTimer = object : CountDownTimer(30000, 1000) {
                override fun onTick(millisUntilFinished: Long) {
                    val sec = (millisUntilFinished / 1000).toInt()
                    timerText.text = "${sec}s"
                }

                override fun onFinish() {
                    hideOverlayCard()
                }
            }.start()

            progressAnimator?.cancel()
            progressAnimator = ValueAnimator.ofFloat(1f, 0f).apply {
                duration = 30000
                interpolator = LinearInterpolator()
                addUpdateListener { animator ->
                    val fraction = animator.animatedValue as Float
                    val newWidth = (cardWidth * fraction).toInt()
                    val lp = progressBar.layoutParams
                    lp.width = newWidth
                    progressBar.layoutParams = lp
                }
                start()
            }

            try {
                // Play identical new_booking sound file from res/raw on continuous loop
                val resId = resources.getIdentifier("new_booking", "raw", packageName)
                if (resId != 0) {
                    mediaPlayer?.release()
                    try {
                        val afd = resources.openRawResourceFd(resId)
                        if (afd != null) {
                            mediaPlayer = MediaPlayer().apply {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                    setAudioAttributes(
                                        android.media.AudioAttributes.Builder()
                                            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                            .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                                            .build()
                                    )
                                } else {
                                    @Suppress("DEPRECATION")
                                    setAudioStreamType(android.media.AudioManager.STREAM_ALARM)
                                }
                                setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                                afd.close()
                                prepare()
                                isLooping = true
                                setVolume(1.0f, 1.0f)
                                start()
                            }
                        } else {
                            mediaPlayer = MediaPlayer.create(applicationContext, resId)?.apply {
                                isLooping = true
                                setVolume(1.0f, 1.0f)
                                start()
                            }
                        }
                    } catch (e: Exception) {
                        mediaPlayer = MediaPlayer.create(applicationContext, resId)?.apply {
                            isLooping = true
                            setVolume(1.0f, 1.0f)
                            start()
                        }
                    }
                } else {
                    val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    ringtone = RingtoneManager.getRingtone(applicationContext, soundUri)
                    ringtone?.play()
                }

                vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val pattern = longArrayOf(0, 800, 400, 800, 400)
                    vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(longArrayOf(0, 800, 400, 800), 0)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun hideOverlayCard() {
        try {
            overlayTimer?.cancel()
            overlayTimer = null
            progressAnimator?.cancel()
            progressAnimator = null

            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            mediaPlayer = null
            ringtone?.stop()
            ringtone = null
            vibrator?.cancel()
            vibrator = null
            overlayCardView?.let {
                windowManager?.removeView(it)
                overlayCardView = null
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun bringAppToForeground(bookingId: String?) {
        try {
            lastAcceptedBookingId = bookingId
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                if (!bookingId.isNullOrEmpty()) {
                    putExtra("bookingId", bookingId)
                    putExtra("action", "accept")
                }
            }
            if (launchIntent != null) {
                startActivity(launchIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Driver Duty & Floating Bubble",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps driver online and floating overlay active"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            packageManager.getLaunchIntentForPackage(packageName) ?: Intent(),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("My Load 24 • Duty Active")
            .setContentText("Listening for nearby load requests in background")
            .setSmallIcon(if (applicationInfo.icon != 0) applicationInfo.icon else android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        try {
            hideBubbleView()
            hideOverlayCard()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        super.onDestroy()
    }
}
