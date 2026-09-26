---
name: android
description: Build, install and drive an Android APK on-device with no desktop, no adb and no Gradle — compile directly with aapt2/javac/d8/apksigner and install with pm install. Use when asked to create, build or ship an Android app.
---

# On-device Android development

You build real APKs **on the device**: `aapt2` → `javac` → `d8` → `apksigner`,
then `pm install` as root. Sources are plain **Java**. Everything is driven by the
`droid` helper next to this file; the toolchain comes from Termux packages already
on `PATH`.

## 1. Lay out the project

```
MyApp/
├── AndroidManifest.xml     required; package="com.example.myapp"
├── java/                   Java sources in package dirs
├── res/ assets/            optional
└── libs/*.jar              optional compile classpath
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.myapp">
    <application android:label="MyApp" android:theme="@android:style/Theme.Material.Light">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
```

```java
package com.example.myapp;
import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
public class MainActivity extends Activity {
    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        TextView t = new TextView(this);
        t.setText("Hello from on-device Android");
        setContentView(t);
    }
}
```

## 2. Build

`droid build` installs the Termux toolchain and downloads the API 36
`android.jar` on first run (needs network; no root). Intermediates go to
`MyApp/.build` and are removed on success.

```bash
./droid build ~/Android/Projects/MyApp          # -> MyApp/app.apk
./droid build ~/Android/Projects/MyApp out.apk  # explicit output
```

## 3. Test on the host

Keep the logic **Android-free** — pure Java, with the `android.*` code confined to a
thin shell — so most of the app can be tested without a device. Put host tests in
`test/`:

```bash
./droid test ~/Android/Projects/MyApp                     # every test class with a main()
./droid test ~/Android/Projects/MyApp com.example.MyTest  # or only the ones you name
```

`test` compiles `test/**/*.java` with `java/` as `-sourcepath` into
`MyApp/.build/htest` — so Android-only sources are pulled in only if a test
actually reaches them — then runs each test class declaring a `main()`, and exits
non-zero if any of them fails. It needs `java`/`javac`, no root and no device. For
anything it does not cover, call `javac`/`java` directly.

## 4. Take over the device — check readiness, every time

Everything below drives the *real* phone, so **check it every time you take it
over** — before each foreground command, not just the first one:

```bash
./droid ready com.example.myapp   # READY, or NOT READY plus the reasons (exit 1)
```

`ready` reads the device state instead of assuming it: the app must be the
focused root task, visible and installed, and Termux must be floating. If it says
NOT READY, **send no input, infer nothing, and ask the user** — a successful
`install`/`launch` does not mean the app is on top.

A floated Termux can also take the focused-root-task slot itself, so after
floating it, bring the app forward again (`./droid launch <pkg>`, or a tap) and
check again.

ColorOS quirks are behind those checks:
- A floating Termux can steal focus, so `mCurrentFocus`/`topResumedActivity` may
  read `com.termux` even while the app is the foreground app — `ready` reads the
  root task instead.
- Termux's task still reports `mode=fullscreen` while floated, so `ready` matches
  the floating-window shell (`hasCaption`/`scale`).
- When in doubt, `./droid shot` and look: if all you can see is Termux, the app
  is not ready.
- For the raw state: `./droid activity com.example.myapp`.

The user may be using the phone while you work. If the screen or the app state
changes in a way your input did not cause, assume the user is steering: stop,
ask before resuming, and do not fight them for the screen.

Once, before the first input:

1. Ask the user to enable Termux's floating/overlay window, so Termux (running
   the agent) is not frozen or killed while the app is in front.
2. Tell the user you are about to send taps and keys and ask them not to touch
   the phone until you are done.

## 5. Ship, install and launch

```bash
./droid ship ~/Android/Projects/MyApp/app.apk     # -> /sdcard/Packages/MyApp.apk
./droid install ~/Android/Projects/MyApp/app.apk
./droid launch com.example.myapp
./droid stop com.example.myapp
```

`ship` copies the built APK to `/sdcard/Packages/<Name>.apk`, where `<Name>`
defaults to the APK's project directory (`MyApp/app.apk` -> `MyApp.apk`) and can
be overridden as a second argument. It is how the user gets an APK to install by
hand, and it touches no device state, so it never needs the screen.

`install` replaces, allows downgrade/test, and grants permissions. `launch`
resolves the launcher activity and falls back to `monkey` if that comes up empty.

## 6. Observe

The **view tree** is exact and OCR-free; prefer it over screenshots:

```bash
./droid ui                       # uiautomator dump, printed
./droid shot [NAME]              # PNG -> ~/Android/Screenshots/, path printed
./droid activity com.example.myapp
./droid crash                    # recent crashes / ANRs
```

Each node gives `class`, `text`, `content-desc`, `resource-id`,
`bounds="[x1,y1][x2,y2]"` and clickable/scrollable flags; its centre
`(x1+x2)/2,(y1+y2)/2` is what `droid tap` wants.

Whatever a view draws itself — WebViews, canvas/SurfaceView, and many apps'
custom sheets (Taobao's SKU picker, for one) — exposes **no a11y nodes**, so `ui`
returns an empty container with no text. When a region comes back empty, fall back
to a screenshot and read coordinates off it: `./droid shot` writes
`~/Android/Screenshots/<timestamp>.png` and prints the path (name one with
`./droid shot after-tap`). Keep `ui` for the native chrome (tabs, bars, buttons)
and reach for pixels only for the custom-drawn interior.

`am` on PATH is Termux's `termux-am` wrapper (app_process), so an `am` run from
inside Termux records com.termux as the caller, not the shell. Intent extras the
normal text dump hides are in the prototype dump:
`dumpsys activity services com.example.myapp --proto | strings`.

## 7. Drive the UI

```bash
./droid tap 540 1200
./droid swipe 540 1600 540 600 300
./droid key BACK                 # or KEYCODE_HOME / numeric code
./droid text "hello world"       # spaces escaped for you
```

Coordinates are physical pixels, same space as the view tree. Dump again to
confirm and iterate — and re-run `./droid ready` (section 4) before each batch of
input, since the phone may have moved on while you worked.

If typed text arrives in another script, the keyboard is composing it: `./droid
key 204` (`KEYCODE_LANGUAGE_SWITCH`) switches its language. A floating Termux
window sits over the foreground app's right edge, so reach the controls under it
by focus navigation: `./droid key TAB`, then `./droid key ENTER`.

## Notes

**Toolchain**
- `compileSdk`/`targetSdk` 36, `minSdk` 24, Java 17, **Java only**; only
  `arm64-v8a` matters. No NDK, no native libs, no emulator.
- Android 16 needs Termux `aapt2` 16.0.0.4+ (`pkg upgrade aapt2`).
- Debug APK is signed with `~/.android/debug.keystore` (created on first build).
- Root is needed only to install and drive the app, not to build it.

**Rendering**
- `targetSdk` 36 forces edge-to-edge: the activity must apply `WindowInsets`
  system-bar padding itself.
- `Paint.setShader()` does not reset an earlier `setAlpha`/`setColor` — the shader
  is modulated by that alpha, so a reused Paint renders silently translucent.
  Reset it with `setAlpha(255)`, and probe that a 3D shape's centre reaches true
  black/white.

**Termux platform**
- `su` drops the termux-exec `LD_PRELOAD`, so a `#!/usr/bin/env bash` shebang that
  runs inside Termux fails as `No such file or directory` under root. A helper that
  re-elevates launches its own interpreter — `su -c "$BASH script ..."` — instead of
  re-running the script path. For anything `droid` doesn't cover, run the underlying
  command as root: `su -c '<command>'`.
- `RunCommandService` posts a foreground notification in `onCreate()` and clears it
  only in `onStartCommand()`, so any path that runs one without the other — a bind,
  or a restart with a null intent — orphans the "Termux RunCommandService"
  notification.
- App logs/private storage may be unreadable on some ROMs; prefer the view tree and
  `getExternalFilesDir()`.
