from django.core.management.base import BaseCommand
from api.models import Message

class Command(BaseCommand):
    help = 'Updates word_count and char_count for all existing messages'

    def handle(self, *args, **kwargs):
        messages = Message.objects.all()
        total = messages.count()
        self.stdout.write(f"Updating {total} messages...")

        for i, message in enumerate(messages):
            if message.content:
                message.word_count = len(message.content.split())
                message.char_count = len(message.content)
                message.save(update_fields=['word_count', 'char_count'])
            
            if (i + 1) % 1000 == 0:
                self.stdout.write(f"Processed {i + 1}/{total} messages...")

        self.stdout.write(self.style.SUCCESS('Successfully updated all messages'))
