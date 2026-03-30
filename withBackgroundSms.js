const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withBackgroundSmsReceiver = (config) => {
  // 1. Add the Receiver and Service to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    // Add permissions
    const permissions = [
      'android.permission.RECEIVE_SMS',
      'android.permission.READ_SMS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      'android.permission.WAKE_LOCK',
      'android.permission.POST_NOTIFICATIONS'
    ];

    if (!config.modResults.manifest['uses-permission']) {
      config.modResults.manifest['uses-permission'] = [];
    }
    
    permissions.forEach(p => {
      const exists = config.modResults.manifest['uses-permission'].some(up => up.$['android:name'] === p);
      if (!exists) {
        config.modResults.manifest['uses-permission'].push({ $: { 'android:name': p } });
      }
    });

    // Add Receiver
    const receiver = {
      $: {
        'android:name': '.SmsBackgroundReceiver',
        'android:exported': 'true',
        'android:permission': 'android.permission.BROADCAST_SMS'
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } },
            { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }
          ]
        }
      ]
    };

    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }
    
    if (!mainApplication.receiver.some(r => r.$['android:name'] === '.SmsBackgroundReceiver')) {
      mainApplication.receiver.push(receiver);
    }

    // Add Service with foregroundServiceType="dataSync" (Android 14+)
    const service = {
      $: {
        'android:name': '.SmsHeadlessTaskService',
        'android:foregroundServiceType': 'dataSync',
        'android:exported': 'false'
      }
    };

    if (!mainApplication.service) {
      mainApplication.service = [];
    }
    
    if (!mainApplication.service.some(s => s.$['android:name'] === '.SmsHeadlessTaskService')) {
      mainApplication.service.push(service);
    }

    return config;
  });

  // 2. Write the Java Files
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packageName = config.android.package;
      if (!packageName) throw new Error("Android package name must be defined in app.json");

      const packagePath = packageName.replace(/\./g, '/');
      const javaDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', packagePath);

      if (!fs.existsSync(javaDir)) return config;

      const receiverJavaCode = `package ${packageName};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.telephony.SmsMessage;
import androidx.core.content.ContextCompat;
import com.facebook.react.HeadlessJsTaskService;

public class SmsBackgroundReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getAction().equals("android.provider.Telephony.SMS_RECEIVED")) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                Object[] pdus = (Object[]) bundle.get("pdus");
                if (pdus != null && pdus.length > 0) {
                    SmsMessage[] messages = new SmsMessage[pdus.length];
                    StringBuilder sb = new StringBuilder();
                    String sender = "";
                    for (int i = 0; i < pdus.length; i++) {
                        messages[i] = SmsMessage.createFromPdu((byte[]) pdus[i]);
                        sb.append(messages[i].getMessageBody());
                        sender = messages[i].getOriginatingAddress();
                    }
                    
                    String messageBody = sb.toString();
                    
                    Intent serviceIntent = new Intent(context, SmsHeadlessTaskService.class);
                    serviceIntent.putExtra("sms_body", messageBody);
                    serviceIntent.putExtra("sms_sender", sender);
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        ContextCompat.startForegroundService(context, serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                    HeadlessJsTaskService.acquireWakeLockNow(context);
                }
            }
        }
    }
}
`;

      const serviceJavaCode = `package ${packageName};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import com.facebook.react.bridge.WritableMap;

public class SmsHeadlessTaskService extends HeadlessJsTaskService {
    private static final String CHANNEL_ID = "SMS_PROCESSING";

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SMS Processing",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Processing SMS")
                .setContentText("Syncing transaction data...")
                .setSmallIcon(getApplicationInfo().icon)
                .build();

            startForeground(1, notification);
        }
    }

    @Override
    protected HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras != null) {
            WritableMap data = Arguments.fromBundle(extras);
            return new HeadlessJsTaskConfig(
                "BackgroundSmsTask",
                data,
                15000, // Timeout slightly increased to handle DB init + parse
                true
            );
        }
        return null;
    }
}
`;

      fs.writeFileSync(path.join(javaDir, 'SmsBackgroundReceiver.java'), receiverJavaCode);
      fs.writeFileSync(path.join(javaDir, 'SmsHeadlessTaskService.java'), serviceJavaCode);

      return config;
    },
  ]);

  return config;
};

module.exports = withBackgroundSmsReceiver;
