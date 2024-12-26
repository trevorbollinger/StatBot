# StatBot

StatBot is a Discord Server Statistics tool built with discord.py, Django, and React. It allows you to archive and analyze messages from your Discord server.

## Features

- **Real-time Archiving**: Automatically archive messages as they are sent.
- **Historical Import**: Import previous messages using JSON data from Discord Chat Exporter.
- **Daily Archiving**: Archive all messages sent on any previous day without using Discord Chat Exporter.
- **Analytics Dashboard**: View analytics in real time on a React web interface, including:
  - Recent messages
  - Graph showing messages sent over the last 24 hours
  - Total messages sent
  - Average characters per message
  - Most active day
  - Average messages per day
  - Per Channel Statistics
  - Per User Statistics

## Setup

- In the StatBot folder, open the `discord` folder.
- Find the file named `.env` (turn on hidden files).
- Paste your Discord token after the equals symbol, do not add spaces or quotes.
- Start with `docker compose up`.
- Dashboard will be accessable on the hostURL defined in config (`http://localhost:8068` by default)

## Config

- In the `config.js` file you can edit config settings.
  - **Title**: Name of the frontend
  - **hostUrl**: Frontend URL webserver runs on
  - **apiUrl**: Backend URL Django runs on
  - **Note**: If you change these ports, make sure to also change them in `docker-compose.yml`
  - For the URLs, you could also use 127.0.0.1, your server's internal IP, your external IP, your domain name, etc.

## License

This project is open-source.
