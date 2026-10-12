# opencode-copilot-tools

An [OpenCode](https://opencode.ai) TUI plugin with three independent features
(if one fails to set up, the others still work):

1. **Copilot usage bar.** Shows GitHub Copilot premium usage (e.g. `Copilot 42%`)
   in the bottom bar (`app_bottom` slot, visible on home and inside sessions).
   Color: muted <70%, warning 70-90%, error >=90%. Shows `Copilot --` on error.
   Refreshes on start, on `session.idle`, and every 5 minutes.
2. **Copilot sidebar widget.** A "Copilot Quota" section in the sidebar
   (`sidebar_content` slot, just above Context): plan, usage progress bar,
   premium used/entitlement, and days until reset. The sidebar only shows
   inside a chat session, not on the home screen.
3. **`/prices` command** (also in the `ctrl+p` palette as "Models with prices").
   Opens a read-only list of every available model, grouped by provider, with the
   token price in the footer.
   - Footer shows `$input/$output` per 1M tokens, or `Free` when both are 0.
   - Within each provider, models are sorted cheapest first (output, then input).
   - Models without pricing are listed last. Deprecated models are skipped.
   - Selecting a model shows a toast with the full price. It never changes your model or config.
   - `/prices` lists all providers' models, not only Copilot.

4. **Prices in `/models` names.** A server plugin (`server.ts`) appends the
   price per 1M tokens to GitHub Copilot model names, e.g.
   `Claude Sonnet 5.5 ($2/$10)`, so the built-in `/models` dialog shows them.
   Caveats: the name changes everywhere it is displayed (sidebar, prompt
   footer); prices come from the Copilot API `/models` (`billing.token_prices`);
   only Copilot models are covered (not other providers); it fails silently
   (4s timeout) and a name you set in config wins. This is a server plugin, so
   register it with `opencode plugin --global <path>`, which adds it to both
   `opencode.json` (server) and `tui.json` (TUI).

## Install

The plugin is not published to npm. Clone it and register the local path:

    git clone https://github.com/LaloRiojas/opencode-copilot-tools
    opencode plugin --global "file://$PWD/opencode-copilot-tools"

Restart OpenCode. This registers the plugin in `~/.config/opencode/tui.json`.
There are no dependencies to install.

## Where the prices come from

`/prices` makes no network calls. It reads the model data OpenCode has already
loaded (`api.state.provider`):

- **GitHub Copilot models:** OpenCode reads `billing.token_prices` from the
  Copilot `/models` API and converts them to USD per 1M tokens. Cache write is
  always $0 because that endpoint only exposes cached-input reads.
- **Other providers:** prices come from the [models.dev](https://models.dev) catalog.

Check figures against your provider's published pricing before relying on them.

## Usage bar and sidebar data

Uses the Copilot token already stored by OpenCode (`auth.json`); it is never
logged or displayed. Calls the undocumented `copilot_internal/user` endpoint,
which may change. The bar and the sidebar share one fetched state, so only
one request is made per refresh.

## Limitations

- `/prices` is read-only. The TUI plugin API has no model setter.
- It cannot modify the built-in `/models` dialog; that would require patching OpenCode itself.
- `/prices` is registered with the deprecated `api.command.register`, the only
  API supporting a slash name. If it stops working, use the `ctrl+p` palette entry.
- The usage bar depends on an undocumented endpoint and may break without notice.
- Developed against OpenCode 1.18.x. Not verified against other versions.

## Credits

Quota fetching and the sidebar widget adapted from
[fitri/opencode-copilot-usage-plugin](https://github.com/fitri/opencode-copilot-usage-plugin)
by Fitri Rahim (MIT, see LICENSE).

## License

MIT
