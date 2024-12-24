from django.db import models
from django.contrib.auth.models import User

class Guild(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    name = models.CharField(max_length=255)
    icon_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.name


class Channel(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    guild = models.ForeignKey(Guild, related_name='channels', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50)  # e.g., 'text', 'voice'
    category_id = models.CharField(max_length=255, blank=True, null=True)
    category_name = models.CharField(max_length=255, blank=True, null=True)
    topic = models.TextField(blank=True, null=True)
    total_messages = models.IntegerField(default=0)
    total_words = models.IntegerField(default=0)
    total_characters = models.IntegerField(default=0)

    def update_totals(self):
        stats = self.messages.aggregate(
            total_messages=models.Count('id'),
            total_words=models.Sum('word_count'),
            total_characters=models.Sum('char_count')
        )
        self.total_messages = stats['total_messages'] or 0
        self.total_words = stats['total_words'] or 0
        self.total_characters = stats['total_characters'] or 0
        self.save(update_fields=['total_messages', 'total_words', 'total_characters'])

    def __str__(self):
        return self.name


class Role(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    guild = models.ForeignKey(Guild, related_name='roles', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=16, blank=True, null=True)  # e.g., "#FF0000"
    position = models.IntegerField()

    def __str__(self):
        return self.name


class DiscordUser(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    name = models.CharField(max_length=255)
    discriminator = models.CharField(max_length=4)
    nickname = models.CharField(max_length=255, blank=True, null=True)
    avatar_url = models.URLField(blank=True, null=True)
    color = models.CharField(max_length=7, blank=True, null=True)
    is_bot = models.BooleanField(default=False)
    roles = models.ManyToManyField(Role, related_name='users', blank=True)
    total_messages = models.IntegerField(default=0)
    total_words = models.IntegerField(default=0)
    total_characters = models.IntegerField(default=0)

    def update_totals(self):
        stats = self.messages.aggregate(
            total_messages=models.Count('id'),
            total_words=models.Sum('word_count'),
            total_characters=models.Sum('char_count')
        )
        self.total_messages = stats['total_messages'] or 0
        self.total_words = stats['total_words'] or 0
        self.total_characters = stats['total_characters'] or 0
        self.save(update_fields=['total_messages', 'total_words', 'total_characters'])

    def __str__(self):
        return f"[{self.id}][{self.name}]({self.nickname})"


class Message(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    guild = models.ForeignKey(
        Guild, 
        related_name='messages', 
        on_delete=models.CASCADE,
        null=True,  # Allow null temporarily for migration
        blank=True
    )
    channel = models.ForeignKey(Channel, related_name='messages', on_delete=models.CASCADE)
    author = models.ForeignKey(DiscordUser, related_name='messages', on_delete=models.CASCADE)
    type = models.CharField(max_length=50)  # e.g., 'Default', 'Reply'
    content = models.TextField()
    timestamp = models.DateTimeField()
    timestamp_edited = models.DateTimeField(blank=True, null=True)
    call_ended = models.DateTimeField(blank=True, null=True)
    is_pinned = models.BooleanField(default=False)
    reference_message = models.ForeignKey(
        'self', related_name='replies', on_delete=models.SET_NULL, blank=True, null=True
    )
    reactions = models.JSONField(default=dict, blank=True)  # Updated JSONField import
    attachments = models.JSONField(default=list, blank=True)
    embeds = models.JSONField(default=list, blank=True)
    stickers = models.JSONField(default=list, blank=True)
    mentions = models.JSONField(default=list, blank=True)
    inline_emojis = models.JSONField(default=list, blank=True)
    word_count = models.IntegerField(default=0)
    char_count = models.IntegerField(default=0)

    def save(self, *args, **kwargs):
        # Calculate word and character counts
        if self.content:
            self.word_count = len(self.content.split())
            self.char_count = len(self.content)
            #print(f"Saving message with word_count: {self.word_count}, char_count: {self.char_count}")
        
        # Set guild from channel if not explicitly set
        if not self.guild_id and self.channel:
            self.guild = self.channel.guild
            
        super().save(*args, **kwargs)
        
        # Update totals for related models
        if self.channel:
            self.channel.update_totals()
        if self.author:
            self.author.update_totals()

    def delete(self, *args, **kwargs):
        channel = self.channel
        author = self.author
        super().delete(*args, **kwargs)
        
        # Update totals after deletion
        if channel:
            channel.update_totals()
        if author:
            author.update_totals()

    def __str__(self):
        return f"[{self.id}][{self.timestamp.strftime('%m-%d-%y')}][{self.timestamp.strftime('%I:%M %p')}][{self.channel.name}][{self.author.name}]"

    class Meta:
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['channel']),
            models.Index(fields=['author']),
            models.Index(fields=['-timestamp']),
        ]
