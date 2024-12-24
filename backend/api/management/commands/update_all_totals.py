from django.core.management.base import BaseCommand
from api.models import Channel, DiscordUser

class Command(BaseCommand):
    help = 'Updates total words and characters for all channels and users'

    def handle(self, *args, **kwargs):
        self.stdout.write("Updating channel totals...")
        channels = Channel.objects.all()
        for i, channel in enumerate(channels):
            channel.update_totals()
            if (i + 1) % 10 == 0:
                self.stdout.write(f"Processed {i + 1}/{channels.count()} channels")

        self.stdout.write("Updating user totals...")
        users = DiscordUser.objects.all()
        for i, user in enumerate(users):
            user.update_totals()
            if (i + 1) % 10 == 0:
                self.stdout.write(f"Processed {i + 1}/{users.count()} users")

        self.stdout.write(self.style.SUCCESS('Successfully updated all totals'))
