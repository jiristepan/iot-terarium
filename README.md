# iot-terarium

## Espruono

### Flash ESP8266 na espruino

1) v ..esprino-tools/ spustit flash.bat. Upravit com port.
2) Pak odpojit - pripojit USB
3) Kontrola pomoci mobaterm

### Nastaveni wifi

Postupně zadat pres moba term wificonfig.js 

Test po restartu pomoci
```
require("Wifi").getStatus()
require("Wifi").getIP()
```

### Nahrani kodu
Nainstalovat espruiono IDE pres chrome. Pripojit na IP (Setting > Connection)

1) Nastavit cas (setTime.js) - zustane v ESP
2) Nahrat kod pomoci Espruino IDE IDE
3) save()
4) Reboot

Po rebootu otestovat znovu pripojenim pres IDE.





