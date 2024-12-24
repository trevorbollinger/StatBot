import django_setup  # This must be the first import
import discord
from django.utils import timezone
import pytz
from asgiref.sync import sync_to_async
from api.models import Guild, Channel, DiscordUser, Message, Role
import json

with open('emojis.json', 'r') as f:
    emojis = json.load(f)['emojis']

async def get_or_create_guild(guild):
    if not guild:
        return None
    
    guild_obj, _ = await sync_to_async(Guild.objects.get_or_create)(
        id=str(guild.id),
        defaults={
            'name': guild.name,
            'icon_url': str(guild.icon.url) if guild.icon else None
        }
    )
    return guild_obj

async def get_or_create_channel(channel, guild_obj):
    if not hasattr(channel, 'id'):
        return None
    
    channel_type = 'text'
    if isinstance(channel, discord.Thread):
        channel_type = 'thread'
    elif isinstance(channel, discord.VoiceChannel):
        channel_type = 'voice'

    category_id = None
    category_name = None
    if hasattr(channel, 'category') and channel.category:
        category_id = str(channel.category.id)
        category_name = channel.category.name

    channel_obj, _ = await sync_to_async(Channel.objects.get_or_create)(
        id=str(channel.id),
        defaults={
            'guild': guild_obj,
            'name': channel.name if hasattr(channel, 'name') else "Unknown",
            'type': channel_type,
            'category_id': category_id,
            'category_name': category_name,
            'topic': channel.topic if hasattr(channel, 'topic') else None
        }
    )
    return channel_obj

async def get_or_create_user(author, guild_obj):
    # Get roles data
    roles_data = []
    if hasattr(author, 'roles'):
        roles_data = [str(role.id) for role in author.roles]

    user_obj, created = await sync_to_async(DiscordUser.objects.get_or_create)(
        id=str(author.id),
        defaults={
            'name': author.name,
            'discriminator': getattr(author, 'discriminator', '0000'),
            'nickname': getattr(author, 'nick', None),
            'avatar_url': str(author.avatar.url) if author.avatar else None,
            'color': str(author.color) if hasattr(author, 'color') else None,
            'is_bot': author.bot,
        }
    )

    if hasattr(author, 'roles'):
        for role in author.roles:
            await sync_to_async(Role.objects.get_or_create)(
                id=str(role.id),
                defaults={
                    'guild': guild_obj,
                    'name': role.name,
                    'color': str(role.color) if role.color else None,
                    'position': role.position
                }
            )

    if not created:
        await sync_to_async(user_obj.roles.set)(roles_data)
    else:
        roles = await sync_to_async(Role.objects.filter)(id__in=roles_data)
        await sync_to_async(user_obj.roles.set)(roles)

    return user_obj

async def extract_inline_emojis(message):
    """Extract inline emojis from message content"""
    inline_emojis = []
    for char in message.content:
        # Convert emoji character to code point hexadecimal
        if char in emojis:
            emoji_code = format(ord(char), 'x')
            emoji_data = {
                'id': '',
                'name': char,
                'code': emoji_code,
                'isAnimated': False,
                'imageUrl': f"https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/{emoji_code}.svg"
            }
            inline_emojis.append(emoji_data)
    return inline_emojis

async def handle_message(message, bot):
    # Removed the bot check here to allow bot messages to be logged

    try:
        # Get or create related objects
        guild_obj = await get_or_create_guild(message.guild)
        channel_obj = await get_or_create_channel(message.channel, guild_obj)
        author_obj = await get_or_create_user(message.author, guild_obj)

        # Prepare attachments data
        attachments = [{
            'id': str(att.id),
            'url': att.url,
            'fileName': att.filename,
            'fileSizeBytes': att.size
        } for att in message.attachments]

        # Prepare embeds data
        embeds = [{
            'title': embed.title or '',
            'url': embed.url or '',
            'timestamp': embed.timestamp.isoformat() if embed.timestamp else None,
            'description': embed.description or '',
            'thumbnail': {
                'url': embed.thumbnail.url if embed.thumbnail else None,
                'width': getattr(embed.thumbnail, 'width', None),
                'height': getattr(embed.thumbnail, 'height', None)
            } if embed.thumbnail else None,
            'video': {
                'url': embed.video.url if embed.video else None,
                'width': getattr(embed.video, 'width', None),
                'height': getattr(embed.video, 'height', None)
            } if embed.video else None,
            'images': [],  # Add image processing if needed
            'fields': [{
                'name': field.name,
                'value': field.value,
                'inline': field.inline
            } for field in embed.fields],
            'inlineEmojis': []  # Add emoji processing if needed
        } for embed in message.embeds]

        # Prepare mentions data
        mentions = [{
            'id': str(user.id),
            'name': user.name,
            'discriminator': getattr(user, 'discriminator', '0000'),
            'nickname': getattr(user, 'nick', None),
            'color': str(user.color) if hasattr(user, 'color') else None,
            'isBot': user.bot,
            'avatarUrl': str(user.avatar.url) if user.avatar else None,
            'roles': [{
                'id': str(role.id),
                'name': role.name,
                'color': str(role.color) if role.color else None,
                'position': role.position
            } for role in user.roles] if hasattr(user, 'roles') else []
        } for user in message.mentions]

        # Determine message type and reference more accurately
        message_type = 'Default'
        reference_data = None
        reference_message = None
        
        if message.type == discord.MessageType.reply:
            message_type = 'Reply'
            if message.reference:
                reference_data = {
                    'messageId': str(message.reference.message_id),
                    'channelId': str(message.reference.channel_id),
                    'guildId': str(message.reference.guild_id) if message.reference.guild_id else None
                }
                # Try to get the referenced message
                try:
                    referenced_msg = await message.channel.fetch_message(message.reference.message_id)
                    if referenced_msg:
                        reference_message = await sync_to_async(Message.objects.filter(
                            id=str(message.reference.message_id)
                        ).first)()
                except discord.NotFound:
                    print(f"Referenced message {message.reference.message_id} not found")
                except Exception as e:
                    print(f"Error getting reference message: {e}")

        # Extract inline emojis
        inline_emojis = await extract_inline_emojis(message)

        # Create message record
        message_obj = await sync_to_async(Message.objects.create)(
            id=str(message.id),
            guild=guild_obj,
            channel=channel_obj,
            author=author_obj,
            type=message_type,
            content=message.content,
            timestamp=message.created_at,
            timestamp_edited=message.edited_at,
            call_ended=None,  # Add if voice channel support needed
            is_pinned=message.pinned,
            reference_message=reference_message,
            attachments=attachments,
            embeds=embeds,
            stickers=[{
                'id': str(sticker.id),
                'name': sticker.name,
                'format_type': sticker.format.name
            } for sticker in message.stickers],
            reactions={},  # Will be updated by handle_reactions
            mentions=mentions,
            inline_emojis=inline_emojis
        )

        # Handle reactions if any exist
        if message.reactions:
            await handle_reactions(message_obj, message.reactions)

        # Log success
        formatted_time = message.created_at.strftime("[%d/%b/%Y %H:%M:%S]")
        print(f"{formatted_time} Logged message by {message.author.name} in {message.channel.name}")

    except Exception as e:
        print(f"Error handling message: {e}")

    await bot.process_commands(message)

async def get_reference_message(message):
    try:
        if message.reference and message.reference.message_id:
            # Get the actual referenced message from Discord first
            referenced_msg = await message.channel.fetch_message(message.reference.message_id)
            if referenced_msg:
                # Now check if it exists in our database
                return await sync_to_async(Message.objects.filter(
                    id=str(message.reference.message_id)
                ).first)()
    except discord.NotFound:
        # Message was deleted or not accessible
        print(f"Referenced message {message.reference.message_id} not found")
    except Exception as e:
        print(f"Error getting reference message: {e}")
    return None

async def handle_reactions(message_obj, reactions):
    reactions_data = {}
    for reaction in reactions:
        emoji = reaction.emoji
        emoji_key = str(emoji.id) if hasattr(emoji, 'id') and emoji.id else emoji
        
        emoji_data = {
            'id': str(emoji.id) if hasattr(emoji, 'id') else '',
            'name': emoji.name if hasattr(emoji, 'name') else str(emoji),
            'code': getattr(emoji, 'code', None),
            'isAnimated': getattr(emoji, 'animated', False),
            'imageUrl': str(emoji.url) if hasattr(emoji, 'url') else None,
            'count': reaction.count
        }
        reactions_data[emoji_key] = emoji_data
    
    await sync_to_async(Message.objects.filter(id=message_obj.id).update)(
        reactions=reactions_data
    )
