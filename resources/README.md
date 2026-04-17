# Capacitor App Assets

Source images for iOS and Android app icons + splash screens.

- `icon.png` — 1024×1024 app icon (required)
- `splash.png` — 1920×1920 splash screen (required, dark background)

## Generate native assets

After `npx cap add ios` / `npx cap add android`, run from the project root:

```bash
npx capacitor-assets generate --iconBackgroundColor '#0a1628' --iconBackgroundColorDark '#0a1628' --splashBackgroundColor '#0a1628' --splashBackgroundColorDark '#0a1628'
```

This generates all required icon and splash sizes into `ios/App/App/Assets.xcassets/` and `android/app/src/main/res/`.

Then run:

```bash
npx cap sync
```
