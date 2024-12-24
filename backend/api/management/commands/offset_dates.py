from django.core.management.base import BaseCommand
from api.models import Message
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Offsets all message timestamps by 24 hours backwards'

    def handle(self, *args, **kwargs):
        # Calculate the time offset
        time_offset = timedelta(days=-1)
        
        # Get all messages
        messages = Message.objects.all()
        
        # Update each message's timestamp
        for message in messages:
            original_timestamp = message.timestamp
            new_timestamp = original_timestamp + time_offset
            message.timestamp = new_timestamp
            message.save()
            self.stdout.write(self.style.SUCCESS(f'Updated message {message.id} from {original_timestamp} to {new_timestamp}'))
        
        self.stdout.write(self.style.SUCCESS('Successfully offset all message timestamps by 24 hours backwards'))
