import django_setup  # This must be the first import
from typing import Final
import discord
import os
from dotenv import load_dotenv
from discord.ext import commands
from on_message import handle_message
from functions import (
    get_or_create_discord_user_sync,
    insert_message_sync,
    get_or_create_discord_user_async,
    insert_message_async
)

load_dotenv()
TOKEN: Final[str] = os.getenv('DISCORD_TOKEN')

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f'Connected as {bot.user.name}')
    try:
        await bot.load_extension('commands')
        await bot.load_extension('get_messages')
        await bot.load_extension('json_logging')
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} command(s)")
    except Exception as e:
        print(f"Error syncing commands: {e}")

@bot.event
async def on_message(message):
    await handle_message(message, bot)

if __name__ == "__main__":
    if not TOKEN:
        raise ValueError("No token found. Check your .env file")
    bot.run(TOKEN)