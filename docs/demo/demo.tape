# Records docs/demo/demo.gif. Run through ./docs/demo/record.sh, which sets up the demo accounts.

Output demo.gif

Set Shell "bash"
Set FontSize 20
Set Width 1240
Set Height 640
Set Padding 28
Set Theme "Dracula"
Set TypingSpeed 45ms

Hide
Type "export PS1='$ '" Enter
Type "clear" Enter
Show

Type "easw list" Sleep 400ms Enter
Sleep 2s

Type "easw add client-acme" Sleep 400ms Enter
Sleep 1.5s
Down Sleep 350ms Down Sleep 350ms Down Sleep 500ms Enter
Sleep 1.2s
Type "demo-client" Sleep 400ms Enter
Sleep 2.5s

Hide
Type "clear" Enter
Show

Type "easw use work" Sleep 400ms Enter
Sleep 1.2s
Type "easw whoami" Sleep 400ms Enter
Sleep 1.5s
Type "eas whoami   # your normal login is untouched" Sleep 400ms Enter
Sleep 2.5s

Hide
Type "clear" Enter
Show

Type "cd acme-app && easw link client-acme" Sleep 400ms Enter
Sleep 1.5s
Type "easw build --platform ios" Sleep 400ms Enter
Sleep 4s
