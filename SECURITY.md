# Security Policy

EASwitch handles Expo access tokens, so security reports are taken seriously.

## Reporting a vulnerability

**Please don't open a public issue.** Report it privately through GitHub:
[Report a vulnerability](https://github.com/iamgarriTech/easwitch/security/advisories/new).

Include what you found, how to reproduce it, and the impact you expect. You'll get an acknowledgement within a few days, and a fix or mitigation plan once the issue is confirmed. You'll be credited in the release notes unless you'd rather not be.

## In scope

- Tokens leaking outside the OS credential store (config files, logs, error output, other processes)
- `EXPO_TOKEN` persisting beyond the child process EASwitch starts
- EASwitch modifying the user's normal Expo login
- Running the wrong account's token because of a resolution bug

## Supported versions

Only the latest published version receives fixes.
