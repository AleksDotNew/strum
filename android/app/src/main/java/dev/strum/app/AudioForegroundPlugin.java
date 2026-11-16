package dev.strum.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioForeground")
public class AudioForegroundPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        try {
            Context context = getContext();
            String trackName = call.getString("trackName", "Strum — Live Pattern");

            Intent intent = new Intent(context, AudioForegroundService.class);
            intent.setAction(AudioForegroundService.ACTION_START);
            intent.putExtra(AudioForegroundService.EXTRA_TRACK_NAME, trackName);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start foreground service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, AudioForegroundService.class);
            intent.setAction(AudioForegroundService.ACTION_STOP);

            try {
                context.startService(intent);
            } catch (Exception ignored) {}
            context.stopService(intent);

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop foreground service: " + e.getMessage(), e);
        }
    }
}
