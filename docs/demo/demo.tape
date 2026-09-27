# Records docs/demo/demo.gif and demo.mp4. Run through ./docs/demo/record.sh, which sets up the demo accounts
# and points zsh's config folder away from your real ~/.zshrc.

Output demo.gif
Output demo.mp4

Set Shell "bash"
Set FontSize 20
Set Width 1340
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

Type "cd acme-app && easw link work" Sleep 400ms Enter
Sleep 2s
Enter
Sleep 3s

# Like opening a new terminal: load the hook easw link just set up.
Hide
Type "source $ZDOTDIR/.zshrc && clear" Enter
Show

Type "# new terminal: keep typing eas" Sleep 400ms Enter
Sleep 800ms
Type "eas whoami" Sleep 400ms Enter
Sleep 2s
Type "eas build --platform ios" Sleep 400ms Enter
Sleep 3.5s
Type "cd .. && eas whoami   # not a linked project: your normal login" Sleep 400ms Enter
Sleep 3.5s
