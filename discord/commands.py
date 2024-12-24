import discord
from discord import app_commands
from discord.ext import commands
from asgiref.sync import sync_to_async
from api.models import Message
from django.db.models import Avg, Sum, Count
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StatCommands(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="stats", description="View message statistics")
    async def stats(self, interaction: discord.Interaction):
        # Get statistics using aggregation
        stats = await sync_to_async(lambda: Message.objects.aggregate(
            total_messages=Count('id'),
            total_words=Sum('word_count'),
            total_chars=Sum('char_count'),
            avg_words=Avg('word_count'),
            avg_chars=Avg('char_count')
        ))()
        
        # Format the message
        stats_message = "📊 **Message Statistics**\n\n"
        stats_message += f"Total Messages: `{stats['total_messages']:,}`\n"
        stats_message += f"Total Words: `{stats['total_words']:,}`\n"
        stats_message += f"Total Characters: `{stats['total_chars']:,}`\n"
        stats_message += f"Average Words/Message: `{stats['avg_words']:.1f}`\n"
        stats_message += f"Average Characters/Message: `{stats['avg_chars']:.1f}`"
        
        print(stats_message)
        await interaction.response.send_message(stats_message)

async def setup(bot: commands.Bot):
    await bot.add_cog(StatCommands(bot))