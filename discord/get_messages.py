import discord
from discord import app_commands
from discord.ext import commands
from datetime import datetime, timedelta
import pytz
from asgiref.sync import sync_to_async
from api.models import Guild, Channel, Message, DiscordUser, Role
from functions import insert_message_sync

class GetMessages(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.central_tz = pytz.timezone('America/Chicago')

    @app_commands.command(
        name="archive_date",
        description="Get all messages from a specific date (Central Time)"
    )
    @app_commands.describe(
        date="Date in MM/DD/YY format (e.g., 12/25/23)"
    )
    async def get_messages_by_date(self, interaction: discord.Interaction, date: str):
        try:
            # Parse the date with new format
            target_date = datetime.strptime(date, '%m/%d/%y')
            target_date = self.central_tz.localize(target_date)
            
            # Set the time range for the entire day in Central Time
            start_time = target_date
            end_time = target_date + timedelta(days=1)

            # Convert to UTC for Discord API
            start_time_utc = start_time.astimezone(pytz.UTC)
            end_time_utc = end_time.astimezone(pytz.UTC)

            await interaction.response.defer(ephemeral=True)

            total_messages = 0
            processed_channels = 0

            # Process all channels in the guild
            for channel in interaction.guild.channels:
                if not isinstance(channel, discord.TextChannel):
                    continue

                processed_channels += 1
                try:
                    async for message in channel.history(
                        after=start_time_utc,
                        before=end_time_utc,
                        limit=None
                    ):
                        # Create guild object
                        guild_data = {
                            'id': str(interaction.guild.id),
                            'name': interaction.guild.name,
                            'icon_url': str(interaction.guild.icon.url) if interaction.guild.icon else None
                        }

                        # Create channel data
                        channel_data = {
                            'id': str(channel.id),
                            'name': channel.name,
                            'type': str(channel.type),
                            'category': channel.category.name if channel.category else None,
                            'categoryId': str(channel.category.id) if channel.category else None,
                            'topic': channel.topic
                        }

                        # Create author data
                        author_data = {
                            'id': str(message.author.id),
                            'name': message.author.name,
                            'discriminator': message.author.discriminator,
                            'nickname': message.author.nick,
                            'avatar_url': str(message.author.avatar.url) if message.author.avatar else None,
                            'is_bot': message.author.bot,
                            'roles': [
                                {
                                    'id': str(role.id),
                                    'name': role.name,
                                    'color': role.color.value if role.color else None,
                                    'position': role.position
                                }
                                for role in message.author.roles
                            ]
                        }

                        # Create message data
                        message_data = {
                            'id': str(message.id),
                            'content': message.content,
                            'timestamp': message.created_at.isoformat(),
                            'timestamp_edited': message.edited_at.isoformat() if message.edited_at else None,
                            'type': str(message.type),
                            'is_pinned': message.pinned,
                            'reference': {
                                'messageId': str(message.reference.message_id)
                            } if message.reference else None,
                            'attachments': [
                                {
                                    'id': str(attachment.id),
                                    'filename': attachment.filename,
                                    'url': attachment.url,
                                    'size': attachment.size
                                }
                                for attachment in message.attachments
                            ],
                            'embeds': [embed.to_dict() for embed in message.embeds],
                            'reactions': [
                                {
                                    'emoji': str(reaction.emoji),
                                    'count': reaction.count
                                }
                                for reaction in message.reactions
                            ]
                        }

                        # Store in database using json_logging logic
                        guild_obj, _ = await sync_to_async(Guild.objects.get_or_create)(
                            id=guild_data['id'],
                            defaults={
                                'name': guild_data['name'],
                                'icon_url': guild_data['icon_url']
                            }
                        )

                        channel_obj, _ = await sync_to_async(Channel.objects.get_or_create)(
                            id=channel_data['id'],
                            defaults={
                                'guild': guild_obj,
                                'name': channel_data['name'],
                                'type': channel_data['type'],
                                'category_id': channel_data['categoryId'],
                                'category_name': channel_data['category'],
                                'topic': channel_data['topic']
                            }
                        )

                        # Create user without roles first
                        user_obj, _ = await sync_to_async(DiscordUser.objects.get_or_create)(
                            id=author_data['id'],
                            defaults={
                                'name': author_data['name'],
                                'discriminator': author_data['discriminator'],
                                'nickname': author_data['nickname'],
                                'avatar_url': author_data['avatar_url'],
                                'is_bot': author_data['is_bot']
                            }
                        )

                        # Update roles
                        role_objects = []
                        for role_data in author_data['roles']:
                            role_obj, _ = await sync_to_async(Role.objects.get_or_create)(
                                id=role_data['id'],
                                defaults={
                                    'guild': guild_obj,
                                    'name': role_data['name'],
                                    'color': role_data['color'],
                                    'position': role_data['position']
                                }
                            )
                            role_objects.append(role_obj)

                        if role_objects:
                            await sync_to_async(user_obj.roles.set)(role_objects)

                        # Create message
                        await sync_to_async(Message.objects.get_or_create)(
                            id=message_data['id'],
                            defaults={
                                'guild': guild_obj,
                                'channel': channel_obj,
                                'author': user_obj,
                                'content': message_data['content'],
                                'timestamp': message.created_at,
                                'timestamp_edited': message.edited_at,
                                'type': message_data['type'],
                                'is_pinned': message_data['is_pinned'],
                                'attachments': message_data['attachments'],
                                'embeds': message_data['embeds'],
                                'reactions': {str(r['emoji']): {'count': r['count']} for r in message_data['reactions']}
                            }
                        )

                        total_messages += 1

                except discord.Forbidden:
                    continue
                except Exception as e:
                    print(f"Error processing channel {channel.name}: {str(e)}")

            await interaction.followup.send(
                f"Processed {processed_channels} channels and stored {total_messages} messages from {date}",
                ephemeral=True
            )

        except ValueError:
            await interaction.response.send_message(
                "Invalid date format. Please use MM/DD/YY (e.g., 12/25/23)",
                ephemeral=True
            )
        except Exception as e:
            await interaction.response.send_message(
                f"An error occurred: {str(e)}",
                ephemeral=True
            )

async def setup(bot: commands.Bot):
    await bot.add_cog(GetMessages(bot))
