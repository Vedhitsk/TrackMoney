const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withBackgroundSmsReceiver = (config) => {
  // 1. Add the Receiver and Service to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    // Add permissions — NO RECEIVE_BOOT_COMPLETED (reduces YONO SBI risk score)
    const permissions = [
      'android.permission.RECEIVE_SMS',
      'android.permission.READ_SMS',
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

    // Add Receiver — only SMS_RECEIVED, no BOOT_COMPLETED
    const receiver = {
      $: {
        'android:name': '.SmsBackgroundReceiver',
        'android:exported': 'true',
        'android:permission': 'android.permission.BROADCAST_SMS'
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } }
          ]
        }
      ]
    };

    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }
    
    // Remove old receiver if present, then add the clean one
    mainApplication.receiver = mainApplication.receiver.filter(r => r.$['android:name'] !== '.SmsBackgroundReceiver');
    mainApplication.receiver.push(receiver);

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

      // ─── BroadcastReceiver ─────────────────────────────────────────────
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
        if (intent.getAction() != null && intent.getAction().equals("android.provider.Telephony.SMS_RECEIVED")) {
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

      // ─── HeadlessTaskService (TRANSIENT — stops itself after processing) ──
      const serviceJavaCode = `package ${packageName};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
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
                "Transaction Processing",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Brief processing when a new transaction SMS is detected");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("TrackMoney")
                .setContentText("Checking for new transactions")
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
                15000,
                true
            );
        }
        return null;
    }

    @Override
    public void onHeadlessJsTaskFinish(int taskId) {
        super.onHeadlessJsTaskFinish(taskId);
        // Stop the service immediately after the JS task completes.
        // This makes the service TRANSIENT (a few seconds) instead of persistent.
        // A persistent foreground service with SMS access = spyware signature
        // to banking apps like YONO SBI.
        stopSelf();
    }
}
`;

      // ─── SMS Inbox Reader (Native Module for backfill on app open) ──
      const inboxModuleCode = `package ${packageName};

import android.database.Cursor;
import android.net.Uri;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class SmsInboxModule extends ReactContextBaseJavaModule {
    public SmsInboxModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "SmsInboxModule";
    }

    @ReactMethod
    public void getRecentSms(int hoursAgo, Promise promise) {
        try {
            long since = System.currentTimeMillis() - ((long) hoursAgo * 3600000L);
            Uri uri = Uri.parse("content://sms/inbox");
            String selection = "date >= ?";
            String[] selectionArgs = { String.valueOf(since) };

            Cursor cursor = getReactApplicationContext()
                .getContentResolver()
                .query(uri, new String[]{"address", "body", "date"}, selection, selectionArgs, "date DESC");

            WritableArray results = Arguments.createArray();

            if (cursor != null) {
                while (cursor.moveToNext()) {
                    WritableMap sms = Arguments.createMap();
                    sms.putString("sender", cursor.getString(0) != null ? cursor.getString(0) : "");
                    sms.putString("body", cursor.getString(1) != null ? cursor.getString(1) : "");
                    sms.putDouble("date", cursor.getLong(2));
                    results.pushMap(sms);
                }
                cursor.close();
            }

            promise.resolve(results);
        } catch (Exception e) {
            promise.reject("SMS_INBOX_ERROR", e.getMessage(), e);
        }
    }
}
`;

      const inboxPackageCode = `package ${packageName};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SmsInboxPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new SmsInboxModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

      fs.writeFileSync(path.join(javaDir, 'SmsBackgroundReceiver.java'), receiverJavaCode);
      fs.writeFileSync(path.join(javaDir, 'SmsHeadlessTaskService.java'), serviceJavaCode);
      fs.writeFileSync(path.join(javaDir, 'SmsInboxModule.java'), inboxModuleCode);
      fs.writeFileSync(path.join(javaDir, 'SmsInboxPackage.java'), inboxPackageCode);

      // ─── Register SmsInboxPackage in MainApplication ──
      const ktPath = path.join(javaDir, 'MainApplication.kt');
      const javaPath = path.join(javaDir, 'MainApplication.java');
      const mainAppPath = fs.existsSync(ktPath) ? ktPath : (fs.existsSync(javaPath) ? javaPath : null);

      if (mainAppPath) {
        let contents = fs.readFileSync(mainAppPath, 'utf-8');

        if (!contents.includes('SmsInboxPackage')) {
          if (mainAppPath.endsWith('.kt')) {
            // Kotlin — add import after package declaration
            contents = contents.replace(
              /(package .+\n)/,
              `$1\nimport ${packageName}.SmsInboxPackage\n`
            );
            // Add to packages list — try common Expo patterns
            if (contents.includes('PackageList(this).packages.apply')) {
              contents = contents.replace(
                /PackageList\(this\)\.packages\.apply\s*\{/,
                'PackageList(this).packages.apply {\n          add(SmsInboxPackage())'
              );
            } else if (contents.includes('PackageList(this).packages')) {
              contents = contents.replace(
                /PackageList\(this\)\.packages/,
                'PackageList(this).packages.apply { add(SmsInboxPackage()) }'
              );
            }
          } else {
            // Java
            contents = contents.replace(
              /(package .+;\n)/,
              `$1\nimport ${packageName}.SmsInboxPackage;\n`
            );
            contents = contents.replace(
              /(List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);)/,
              '$1\n        packages.add(new SmsInboxPackage());'
            );
          }
          fs.writeFileSync(mainAppPath, contents);
        }
      }

      return config;
    },
  ]);

  return config;
};

module.exports = withBackgroundSmsReceiver;
