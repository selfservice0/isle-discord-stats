Sends The Isle server chat, joins, leaves, kills and deaths to Discord, with links to player stats.

1. Stop your Windows server with UE4SS installed.
2. Drag the `IsleDiscordChat` and `IsleDiscordSender` folders into `TheIsle/Binaries/Win64/ue4ss/Mods/`.
3. In `IsleDiscordChat/relay/`, rename `config.example.json` to `config.json` and set `webhook_url` and `server_name`. Keep your existing `config.json` when updating.
4. Restart the server.
