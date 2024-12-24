import django_setup  # This must be the first import
from api.models import Message, DiscordUser
from asgiref.sync import sync_to_async
import pytz

def get_or_create_discord_user_sync(author):
    # Safe getattr for all potentially missing attributes
    avatar_url = author.avatar.url if author.avatar else None
    banner_url = author.banner.url if getattr(author, 'banner', None) else None
    accent_color = getattr(author, 'accent_color', None)
    
    discord_user, created = DiscordUser.objects.get_or_create(
        discord_id=str(author.id),  # Use discord_id as primary identifier
        defaults={
            'username': author.name,
            'discriminator': getattr(author, 'discriminator', '0000'),
            'global_name': getattr(author, 'display_name', author.name),
            'avatar': str(avatar_url) if avatar_url else None,
            'banner': str(banner_url) if banner_url else None,
            'accent_color': accent_color,
            'avatar_decoration_data': getattr(author, 'avatar_decoration_data', None),
        }
    )
    
    # Update user info if it has changed
    if not created:
        discord_user.username = author.name
        discord_user.discriminator = getattr(author, 'discriminator', '0000')
        discord_user.global_name = getattr(author, 'display_name', author.name)
        discord_user.avatar = str(avatar_url) if avatar_url else None
        discord_user.banner = str(banner_url) if banner_url else None
        discord_user.accent_color = accent_color
        discord_user.save()
    
    return discord_user

def insert_message_sync(server_name, channel_name, user_name, user_id, timestamp, char_count, 
                       word_count, contains_attachment, contains_mention, emojis_used, message_content,
                       mention_everyone, thread_info, sticker_items, author, server_id=None, channel_id=None, message_id=None):
    # Ensure timestamp is in Central Time
    central = pytz.timezone('America/Chicago')
    if timestamp.tzinfo is None:
        timestamp = pytz.utc.localize(timestamp)
    timestamp = timestamp.astimezone(central)
    # print(f"Timestamp in Central Time before saving: {timestamp}")  # Debug print
    
    contains_emoji = len(emojis_used) > 0
    
    # Get author details
    avatar_url = author.avatar.url if author.avatar else None
    banner_url = author.banner.url if getattr(author, 'banner', None) else None
    accent_color = getattr(author, 'accent_color', None)
    
    # First find or create the Discord user
    try:
        discord_user = DiscordUser.objects.get(username=user_name)
        # Update ALL user fields
        discord_user.discord_id = str(author.id)
        discord_user.discriminator = getattr(author, 'discriminator', '0000')
        discord_user.global_name = getattr(author, 'display_name', author.name)
        discord_user.avatar = str(avatar_url) if avatar_url else None
        discord_user.banner = str(banner_url) if banner_url else None
        discord_user.accent_color = accent_color
        discord_user.avatar_decoration_data = getattr(author, 'avatar_decoration_data', None)
        # Update stats
        discord_user.total_messages += 1
        discord_user.total_characters += char_count
        discord_user.total_words += word_count
        discord_user.save()
    except DiscordUser.DoesNotExist:
        # Create new user with all fields
        discord_user = DiscordUser.objects.create(
            username=user_name,
            discord_id=str(author.id),
            discriminator=getattr(author, 'discriminator', '0000'),
            global_name=getattr(author, 'display_name', author.name),
            avatar=str(avatar_url) if avatar_url else None,
            banner=str(banner_url) if banner_url else None,
            accent_color=accent_color,
            avatar_decoration_data=getattr(author, 'avatar_decoration_data', None),
            total_messages=1,
            total_characters=char_count,
            total_words=word_count
        )
    
    # Create the message
    message = Message.objects.create(
        server_name=server_name,
        channel_name=channel_name,
        user_name=user_name,
        user_id=user_id,
        server_id=server_id,
        channel_id=channel_id,
        message_id=message_id,
        timestamp=timestamp,  # This will now be in Central Time
        char_count=char_count,
        word_count=word_count,
        contains_attachment=contains_attachment,
        contains_mention=contains_mention,
        contains_emoji=contains_emoji,
        emojis_used=emojis_used,
        message_content=message_content,
        mention_everyone=mention_everyone,
        thread_info=thread_info,
        sticker_items=sticker_items,
        discord_user=discord_user
    )
    
    return message, discord_user

# Create async versions of the functions
get_or_create_discord_user_async = sync_to_async(get_or_create_discord_user_sync)
insert_message_async = sync_to_async(insert_message_sync)
