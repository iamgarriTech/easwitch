# easw

This package is an alias for [**easwitch**](https://www.npmjs.com/package/easwitch), so both of these work:

```bash
npm install -g easw
npm install -g easwitch
```

Either one gives you the `easw` and `easwitch` commands. See the [easwitch README](https://github.com/iamgarriTech/easwitch#readme) for documentation.

## Maintainers

This package only depends on `easwitch` (`>=0.2.0`), so installs always get the latest easwitch. Republish it only if `cli.js` or its metadata change:

```bash
cd packages/easw && npm publish
```
