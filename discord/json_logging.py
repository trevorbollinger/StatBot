import discord
from discord import app_commands
from discord.ext import commands
from asgiref.sync import sync_to_async
from api.models import Guild, Channel, Message, DiscordUser, Role
from django.db.models import Avg, Sum, Count
import logging
import json
import os
import pytz
from datetime import datetime
from functions import insert_message_sync
import asyncio
from logging.handlers import RotatingFileHandler

class JsonLogging(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.json_data_path = os.path.join(os.path.dirname(__file__), 'JSON_DATA')
        self.running_tasks = {}
        self.stop_flags = {}
        self.task_status = {}

    async def create_guild_and_channel(self, guild_info, channel_info):
        # Create or update guild
        guild_obj, _ = await sync_to_async(Guild.objects.get_or_create)(
            id=str(guild_info['id']),
            defaults={
                'name': guild_info['name'],
                'icon_url': guild_info.get('iconUrl')
            }
        )

        # Create or update channel
        channel_obj, _ = await sync_to_async(Channel.objects.get_or_create)(
            id=str(channel_info['id']),
            defaults={
                'guild': guild_obj,
                'name': channel_info['name'],
                'type': channel_info['type'],
                'category_id': channel_info.get('categoryId'),
                'category_name': channel_info.get('category'),
                'topic': channel_info.get('topic')
            }
        )
        return guild_obj, channel_obj

    async def create_user(self, author_data):
        # Create or update user without roles
        user_obj, _ = await sync_to_async(DiscordUser.objects.get_or_create)(
            id=str(author_data['id']),
            defaults={
                'name': author_data['name'],
                'discriminator': author_data['discriminator'],
                'nickname': author_data.get('nickname'),
                'avatar_url': author_data.get('avatarUrl'),
                'color': author_data.get('color'),
                'is_bot': author_data.get('isBot', False)
            }
        )
        return user_obj

    async def update_user_roles(self, user_obj, author_data, guild_obj):
        # Handle roles
        role_objects = []
        for role_data in author_data.get('roles', []):
            role_obj, _ = await sync_to_async(Role.objects.get_or_create)(
                id=str(role_data['id']),
                defaults={
                    'guild': guild_obj,
                    'name': role_data['name'],
                    'color': role_data.get('color'),
                    'position': role_data.get('position', 0)
                }
            )
            role_objects.append(role_obj)

        if role_objects:
            # Update user's roles with the new ones from this message
            await sync_to_async(user_obj.roles.set)(role_objects)

    async def handle_reactions(self, message_obj, reactions_data):
        """Process reactions and store them in the message object"""
        if not reactions_data:
            return

        reactions_dict = {}
        for reaction in reactions_data:
            emoji = reaction.get('emoji', {})
            if isinstance(emoji, str):
                emoji_key = emoji
                emoji_data = {
                    'name': emoji,
                    'code': emoji,
                    'count': reaction.get('count', 1)
                }
            else:
                emoji_key = f"{emoji.get('id', '')}:{emoji.get('name', '')}"
                emoji_data = {
                    'id': emoji.get('id'),
                    'name': emoji.get('name', ''),
                    'code': emoji.get('code', ''),
                    'is_animated': emoji.get('isAnimated', False),
                    'image_url': emoji.get('imageUrl'),
                    'count': reaction.get('count', 1)
                }
            reactions_dict[emoji_key] = emoji_data

        await sync_to_async(Message.objects.filter(id=message_obj.id).update)(
            reactions=reactions_dict
        )

    async def import_json_task(self, interaction: discord.Interaction):
        try:
            total_files = 0
            total_messages = 0
            errors = []

            for filename in os.listdir(self.json_data_path):
                if not filename.endswith('.json'):
                    continue

                total_files += 1
                self.task_status[interaction.user.id]['total_files'] = total_files
                
                file_path = os.path.join(self.json_data_path, filename)

                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                    # Create guild and channel
                    guild_obj, channel_obj = await self.create_guild_and_channel(
                        data['guild'],
                        data['channel']
                    )

                    for msg in data.get('messages', []):
                        if self.stop_flags.get(interaction.user.id):
                            self.task_status[interaction.user.id]['status'] = 'stopped'
                            print("Import stopped manually")
                            break

                        try:
                            # Create user without roles first
                            author_obj = await self.create_user(msg['author'])
                            
                            # Update user's roles based on this message
                            await self.update_user_roles(author_obj, msg['author'], guild_obj)

                            # Handle reference message if this is a reply
                            reference_message = None
                            if msg.get('reference'):
                                reference_message = await sync_to_async(Message.objects.filter(
                                    id=str(msg['reference']['messageId'])
                                ).first)()

                            # Create message
                            timestamp = datetime.fromisoformat(msg['timestamp'].replace('Z', '+00:00'))
                            timestamp_edited = None
                            if msg.get('timestampEdited'):
                                timestamp_edited = datetime.fromisoformat(
                                    msg['timestampEdited'].replace('Z', '+00:00')
                                )

                            message_obj = await sync_to_async(Message.objects.create)(
                                id=str(msg['id']),
                                guild=guild_obj,  # Add guild reference
                                channel=channel_obj,
                                author=author_obj,
                                type=msg['type'],
                                content=msg['content'],
                                timestamp=timestamp,
                                timestamp_edited=timestamp_edited,
                                is_pinned=msg.get('isPinned', False),
                                reference_message=reference_message,
                                reactions={},  # Will be updated by handle_reactions
                                # Add new fields
                                attachments=msg.get('attachments', []),
                                embeds=msg.get('embeds', []),
                                stickers=msg.get('stickers', []),
                                mentions=msg.get('mentions', []),
                                inline_emojis=msg.get('inlineEmojis', [])
                            )

                            # Simple console logging with additional info
                            print(f"[{timestamp.strftime('%Y-%m-%d %H:%M:%S')}] Imported message from {author_obj.name} in #{channel_obj.name} (ID: {message_obj.id})")

                            # Handle reactions
                            await self.handle_reactions(message_obj, msg.get('reactions', []))

                            total_messages += 1
                            self.task_status[interaction.user.id]['total_messages'] = total_messages

                        except Exception as e:
                            errors.append(f"Error processing message {msg.get('id', 'unknown')}: {str(e)}")
                            print(f"Error processing message {msg.get('id', 'unknown')}: {str(e)}")

                except Exception as e:
                    errors.append(f"Error processing file {filename}: {str(e)}")
                    print(f"Error processing file {filename}: {str(e)}")

            # Update final status
            self.task_status[interaction.user.id]['status'] = 'completed'
            
            # Prepare response message
            response = f"Processed {total_files} files, imported {total_messages} messages."
            if errors:
                response += f"\n\nErrors ({len(errors)}):"
                for error in errors[:5]:
                    response += f"\n- {error}"
                if len(errors) > 5:
                    response += f"\n...and {len(errors) - 5} more errors"

            # Don't try to send followup if too much time has passed
            try:
                await interaction.followup.send(response, ephemeral=True)
            except discord.NotFound:
                print("Interaction token expired, couldn't send completion message")
            except Exception as e:
                print(f"Couldn't send completion message: {str(e)}")
            
            print(response)

        except Exception as e:
            self.task_status[interaction.user.id]['status'] = 'failed'
            print(f"Import task failed: {str(e)}")
            
        finally:
            # Clean up task references
            if interaction.user.id in self.running_tasks:
                del self.running_tasks[interaction.user.id]
            if interaction.user.id in self.stop_flags:
                del self.stop_flags[interaction.user.id]
            # Keep status for an hour before cleaning up
            await asyncio.sleep(3600)
            if interaction.user.id in self.task_status:
                del self.task_status[interaction.user.id]

    @app_commands.command(name="import_json", description="Import Discord messages from JSON files")
    @app_commands.default_permissions(administrator=True)
    async def import_json(self, interaction: discord.Interaction):
        user_id = interaction.user.id

        # Only allow one task per user
        if user_id in self.running_tasks and not self.running_tasks[user_id].done():
            await interaction.response.send_message(
                "You already have an import task running.",
                ephemeral=True
            )
            return

        # Clean up any completed tasks
        if user_id in self.running_tasks:
            del self.running_tasks[user_id]
        
        self.stop_flags.pop(user_id, None)

        # Initialize status tracking
        self.task_status[user_id] = {
            'status': 'running',
            'total_files': 0,
            'total_messages': 0,
            'start_time': datetime.now()
        }

        # Start the background task
        task = self.bot.loop.create_task(self.import_json_task(interaction))
        self.running_tasks[user_id] = task

        await interaction.response.send_message(
            "Started importing JSON files. This process will run in the background.\n"
            "Use `/import_status` to check progress.\n"
            "Use `/stop_import` to stop the process.",
            ephemeral=True
        )

    @app_commands.command(name="stop_import", description="Stop the ongoing JSON import process")
    async def stop_import(self, interaction: discord.Interaction):
        user_id = interaction.user.id
        if user_id in self.running_tasks:
            self.stop_flags[user_id] = True
            await interaction.response.send_message(
                "🛑 Stopping JSON import...\n"
                "The process will stop after completing the current file.",
                ephemeral=True
            )
        else:
            await interaction.response.send_message(
                "You don't have any active JSON import process.",
                ephemeral=True
            )

    @app_commands.command(name="import_status", description="Check the status of the JSON import process")
    async def import_status(self, interaction: discord.Interaction):
        user_id = interaction.user.id
        if user_id in self.task_status:
            status = self.task_status[user_id]
            elapsed_time = datetime.now() - status['start_time']
            hours = elapsed_time.total_seconds() / 3600

            msg = "📊 **JSON Import Status**\n\n"
            msg += f"Status: `{status['status'].upper()}`\n"
            msg += f"Total Files Processed: `{status['total_files']}`\n"
            msg += f"Total Messages Imported: `{status['total_messages']}`\n"
            msg += f"Running Time: `{hours:.1f} hours`\n"

            await interaction.response.send_message(msg, ephemeral=True)
        else:
            await interaction.response.send_message(
                "No active or recent JSON import process found.",
                ephemeral=True
            )

async def setup(bot: commands.Bot):
    await bot.add_cog(JsonLogging(bot))
