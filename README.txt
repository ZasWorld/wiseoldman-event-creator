WiseOldMan Event Creator
Made by Its Za

Create Wise Old Man clan competitions from a Java desktop app or an installable
web app on iPhone and other devices.

DESKTOP APP
1. Double-click Launch.bat. Java 21 or newer is required.
2. Open Configuration and enter your Wise Old Man group ID and verification code.
3. Save the configuration, then create an event.

WEB APP AND IPHONE
The web app files are in this folder: index.html, app.js, style.css,
manifest.webmanifest, sw.js and the PNG app icons. To use it as an installable iPhone app,
publish this folder (or its contents) as a public GitHub repository and enable
GitHub Pages in the repository settings. GitHub provides the hosting URL; you do
not need to buy a domain. Publishing changes can take a few minutes to appear.

On iPhone, open the published URL in Safari, tap Share, then Add to Home Screen.
Turn on Open as Web App if that option appears, then tap Add. Internet access is
needed to create competitions.

Configuration is saved in the current browser/device only. The verification code
is not encrypted separately. It is not included in this public source package; the
web app sends it to Wise Old Man over HTTPS when you submit an event. Only publish
the app files to a repository you are comfortable making public.

The event picker scrolls through one combined list of skills and bosses. SoTW
and BoTW each have a 50/50 chance, then a matching skill or boss is drawn. Titles
look like "SoTW - Woodcutting" and "BoTW - Nex". Dates and times use the device's
local timezone.

Wise Old Man API documentation:
https://docs.wiseoldman.net/api/competitions/competition-endpoints
